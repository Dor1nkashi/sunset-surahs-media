#!/usr/bin/env python3
"""
Sunset Surahs auto-poster.

Posts videos from queue.json to YouTube Shorts, Instagram Reels and Facebook
Reels using only the official, free APIs. Uses the Python standard library
only (nothing to pip install).

Commands:
    python poster.py run            post whatever is due right now
    python poster.py dry-run        full practice run with fake servers (posts nothing)
    python poster.py status         show what has been posted / failed / is waiting
    python poster.py retry ID PLATFORM   allow a failed item to be tried again
    python poster.py setup-help     what tokens/IDs are needed and how to get them
    python poster.py youtube-auth   one-time Google sign-in to get the YouTube refresh token
    python poster.py import-queue queue_meta.json queue_order.json   build queue.json from the metadata files
    python poster.py publish-youtube   make private YouTube uploads public (privacy_mode private_then_publish)
    python poster.py check          read-only test of your tokens (makes real API calls, posts nothing)
"""

from __future__ import annotations

import argparse
import base64
import datetime as dt
import hashlib
import http.client
import http.server
import json
import logging
import logging.handlers
import os
import re
import secrets as pysecrets
import shutil
import socket
import stat
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from pathlib import Path
from typing import Any, Callable, Optional

BASE_DIR = Path(__file__).resolve().parent
PLATFORMS = ("youtube", "instagram", "facebook")

# Platform hard limits (official docs, checked 20 Nov 2026). Our caps are clamped to these.
# YouTube: Google's videos.insert page (checked 20 Nov 2026) says 100 calls/day, 1 unit each,
# in its own "Video Uploads" bucket. The working cap is config youtube.max_per_day (default 6),
# kept low on purpose; older docs priced an upload at ~1,600 of 10,000 units (= 6/day).
# Instagram: the docs say 100 per
# rolling 24 h in one place and 50 in another, so we use the safer 50.
# Facebook Page Reels: 30 per rolling 24 h.
HARD_LIMIT_24H = {"youtube": 100, "instagram": 50, "facebook": 30}

def platform_limit(cfg: dict, platform: str) -> int:
    if platform == "youtube":
        return min(int((cfg.get("youtube") or {}).get("max_per_day", 6)), HARD_LIMIT_24H["youtube"])
    return HARD_LIMIT_24H[platform]


# A record with one of these statuses blocks posting that video to that platform again.
BLOCKING_STATUSES = ("posted", "pending", "failed")
LIMIT_MARKERS = ("uploadLimitExceeded", "quotaExceeded", "rateLimitExceeded", "dailyLimitExceeded", "request limit reached", "(#4)", "(#9)", "(#32)", "(#613)", "too many calls", "posting too fast")

DEFAULT_CONFIG: dict[str, Any] = {
    "secrets_file": "secrets.json",
    "queue_file": "queue.json",
    "posted_file": "posted.json",
    "log_file": "poster.log",
    "lock_file": "poster.lock",
    "download_dir": "tmp_downloads",
    "enabled_platforms": ["youtube", "instagram", "facebook"],
    "daily_caps": {"youtube": 5, "instagram": 5, "facebook": 5},
    "slots": ["08:00", "12:30", "17:30", "19:30", "21:00"],
    "max_posts_per_run_per_platform": 1,
    "media_base_url": "https://raw.githubusercontent.com/Dor1nkashi/sunset-surahs-media/main/",
    "graph_api_version": "v27.0",
    "instagram_host": "graph.facebook.com",
    "ai_generated": False,
    "youtube": {"category_id": "27", "privacy_status": "public", "made_for_kids": False,
                "max_per_day": 6, "privacy_mode": "public", "ai_generated": None},
    "facebook": {"ai_generated": None},
    "instagram": {"share_to_feed": True},
    "poll_interval_seconds": 30,
    "max_wait_seconds": 600,
    "retry_wait_seconds": 10,
    "max_download_mb": 500,
    "http_timeout_seconds": 120,
}


# --------------------------------------------------------------------------- #
# Secret redaction: nothing secret ever reaches the log, the screen or posted.json
# --------------------------------------------------------------------------- #
class Redactor:
    PATTERNS = [
        (re.compile(r"(access_token|refresh_token|client_secret|code_verifier|input_token|fb_exchange_token)=([^&\s\"']+)", re.I), r"\1=[REDACTED]"),
        (re.compile(r"(\"(?:access_token|refresh_token|client_secret|page_access_token|id_token)\"\s*:\s*\")([^\"]+)(\")", re.I), r"\1[REDACTED]\3"),
        (re.compile(r"\b(Bearer|OAuth)\s+[A-Za-z0-9._\-~+/=]+", re.I), r"\1 [REDACTED]"),
        (re.compile(r"\bEAA[A-Za-z0-9]{20,}"), "[REDACTED]"),   # Meta tokens
        (re.compile(r"\bya29\.[A-Za-z0-9._\-]+"), "[REDACTED]"),  # Google access tokens
        (re.compile(r"\b1//[A-Za-z0-9._\-]{20,}"), "[REDACTED]"),  # Google refresh tokens
    ]

    def __init__(self) -> None:
        self.values: set[str] = set()

    def add(self, value: Any) -> None:
        if isinstance(value, str) and len(value) >= 6:
            self.values.add(value)
        elif isinstance(value, dict):
            for v in value.values():
                self.add(v)

    def __call__(self, text: Any) -> str:
        s = str(text)
        for v in sorted(self.values, key=len, reverse=True):
            s = s.replace(v, "[REDACTED]")
        for pat, repl in self.PATTERNS:
            s = pat.sub(repl, s)
        return s


REDACT = Redactor()


class RedactFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        msg = REDACT(record.getMessage())
        if record.exc_info:
            import traceback
            msg += "\n" + REDACT("".join(traceback.format_exception(*record.exc_info)))
            record.exc_info = None
            record.exc_text = None
        record.msg, record.args = msg, ()
        return True


log = logging.getLogger("poster")


def setup_logging(log_path: Path, console: bool = True) -> None:
    log.handlers.clear()
    log.setLevel(logging.INFO)
    log.propagate = False
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
    log_path.parent.mkdir(parents=True, exist_ok=True)
    fh = logging.handlers.RotatingFileHandler(log_path, maxBytes=2_000_000, backupCount=3, encoding="utf-8")
    fh.setFormatter(fmt)
    fh.addFilter(RedactFilter())
    log.addHandler(fh)
    if console:
        ch = logging.StreamHandler(sys.stdout)
        ch.setFormatter(logging.Formatter("%(message)s"))
        ch.addFilter(RedactFilter())
        log.addHandler(ch)


# --------------------------------------------------------------------------- #
# HTTP layer (real one uses urllib; FakeHttp below is used by dry-run and tests)
# --------------------------------------------------------------------------- #
class NetworkError(Exception):
    """Temporary problem (no connection, timeout, server error 5xx/429). Worth one retry."""


class ApiError(Exception):
    """The platform said no (4xx, bad token, bad video...). Retrying will not help."""


class HttpResponse:
    def __init__(self, status: int, headers: Optional[dict] = None, body: bytes | str | dict = b""):
        self.status = status
        self.headers = {k.lower(): v for k, v in (headers or {}).items()}
        if isinstance(body, dict):
            body = json.dumps(body)
        self.body = body.encode() if isinstance(body, str) else body

    def json(self) -> dict:
        try:
            return json.loads(self.body.decode("utf-8") or "{}")
        except ValueError:
            return {}

    def text(self, limit: int = 400) -> str:
        return self.body.decode("utf-8", "replace")[:limit]


def expect_ok(resp: HttpResponse, what: str) -> HttpResponse:
    if resp.status >= 500 or resp.status == 429:
        raise NetworkError(f"{what}: server busy/error HTTP {resp.status}: {REDACT(resp.text())}")
    if resp.status >= 400:
        raise ApiError(f"{what}: HTTP {resp.status}: {REDACT(resp.text())}")
    return resp


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):  # YouTube uses 308 to mean "upload incomplete"
        return None


class Http:
    def __init__(self, timeout: float = 120):
        self.timeout = timeout
        self.opener = urllib.request.build_opener(_NoRedirect)

    def request(self, method: str, url: str, headers: Optional[dict] = None, body: Any = None) -> HttpResponse:
        if not url.startswith("https://"):
            raise ApiError("refusing non-https request")
        req = urllib.request.Request(url, data=body, method=method, headers=headers or {})
        try:
            with self.opener.open(req, timeout=self.timeout) as r:
                return HttpResponse(r.status, dict(r.headers.items()), r.read())
        except urllib.error.HTTPError as e:
            return HttpResponse(e.code, dict(e.headers.items()) if e.headers else {}, e.read() or b"")
        except (urllib.error.URLError, socket.timeout, TimeoutError, ConnectionError, http.client.HTTPException, OSError) as e:
            raise NetworkError(f"{method} {urllib.parse.urlsplit(url).netloc}: {REDACT(e)}") from None

    def download(self, url: str, dest: Path, max_bytes: int) -> int:
        req = urllib.request.Request(url, headers={"User-Agent": "sunset-surahs-poster/1.0"})
        try:
            with self.opener.open(req, timeout=self.timeout) as r:
                if r.status != 200:
                    raise ApiError(f"download HTTP {r.status}")
                total = 0
                with open(dest, "wb") as f:
                    while True:
                        chunk = r.read(1024 * 1024)
                        if not chunk:
                            break
                        total += len(chunk)
                        if total > max_bytes:
                            raise ApiError("download bigger than max_download_mb")
                        f.write(chunk)
                return total
        except urllib.error.HTTPError as e:
            if e.code >= 500 or e.code == 429:
                raise NetworkError(f"download HTTP {e.code}") from None
            raise ApiError(f"download HTTP {e.code} (is the URL right and public?)") from None
        except (urllib.error.URLError, socket.timeout, TimeoutError, ConnectionError, http.client.HTTPException) as e:
            raise NetworkError(f"download failed: {REDACT(e)}") from None


def form(data: dict) -> bytes:
    return urllib.parse.urlencode({k: v for k, v in data.items() if v is not None}).encode()


# --------------------------------------------------------------------------- #
# Files: config, secrets, queue, posted (atomic writes)
# --------------------------------------------------------------------------- #
def deep_merge(base: dict, extra: dict) -> dict:
    out = dict(base)
    for k, v in extra.items():
        out[k] = deep_merge(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else v
    return out


def resolve(base: Path, p: str) -> Path:
    path = Path(p).expanduser()
    return path if path.is_absolute() else (base / path)


def load_config(path: Path) -> dict:
    user = {}
    if path.exists():
        user = json.loads(path.read_text(encoding="utf-8"))
    cfg = deep_merge(DEFAULT_CONFIG, user)
    cfg["_base"] = str(path.parent.resolve())
    return cfg


def cfg_path(cfg: dict, key: str) -> Path:
    return resolve(Path(cfg["_base"]), cfg[key])


def atomic_write_json(path: Path, data: Any, mode: Optional[int] = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=".tmp_", suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.flush()
            os.fsync(f.fileno())
        if mode is not None and os.name != "nt":
            os.chmod(tmp, mode)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def load_secrets(path: Path) -> dict:
    if not path.exists():
        return {}
    if os.name != "nt":
        mode = stat.S_IMODE(path.stat().st_mode)
        if mode & 0o077:
            os.chmod(path, 0o600)
            log.warning("secrets file was readable by others; permissions fixed to 600")
    data = json.loads(path.read_text(encoding="utf-8"))
    for section in data.values():
        REDACT.add(section)
    return data


def save_secrets(path: Path, data: dict) -> None:
    atomic_write_json(path, data, mode=0o600)


def load_json_list(path: Path) -> list:
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8") or "[]")
    if isinstance(data, dict):  # allow {"items": [...]}
        data = data.get("items", [])
    if not isinstance(data, list):
        raise ValueError(f"{path.name} must be a list")
    return data


class Lock:
    def __init__(self, path: Path, stale_seconds: int = 3 * 3600):
        self.path, self.stale = path, stale_seconds
        self.fd: Optional[int] = None

    def __enter__(self):
        if self.path.exists() and time.time() - self.path.stat().st_mtime > self.stale:
            self.path.unlink()
        try:
            self.fd = os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        except FileExistsError:
            raise RuntimeError("another run is still going (poster.lock exists). If you are sure nothing is running, delete poster.lock") from None
        os.write(self.fd, str(os.getpid()).encode())
        return self

    def __exit__(self, *exc):
        if self.fd is not None:
            os.close(self.fd)
        try:
            self.path.unlink()
        except FileNotFoundError:
            pass


# --------------------------------------------------------------------------- #
# Text helpers
# --------------------------------------------------------------------------- #
def hashtag_text(tags: list) -> str:
    out = []
    for t in tags or []:
        t = str(t).strip().replace(" ", "")
        if t:
            out.append(t if t.startswith("#") else "#" + t)
    return " ".join(out)


def yt_title(item: dict) -> str:
    title = re.sub(r"[<>]", "", str(item.get("youtube_title") or item.get("title", "")).strip()) or "Sunset Surahs"
    return title[:100]


def yt_description(item: dict) -> str:
    desc = str(item.get("youtube_description") or item.get("description", "")).strip()
    tags = hashtag_text(item.get("hashtags", []))
    if tags and tags not in desc:
        desc = (desc + "\n\n" + tags).strip()
    if "#shorts" not in desc.lower():
        desc = (desc + " #Shorts").strip()
    return re.sub(r"[<>]", "", desc)[:5000]


def yt_tags(item: dict) -> list:
    out, total = [], 0
    for t in item.get("tags", []) or []:
        t = re.sub(r"[<>,]", "", str(t)).strip()
        cost = len(t) + (2 if " " in t else 0) + (1 if out else 0)
        if t and total + cost <= 480:
            out.append(t)
            total += cost
    return out


def meta_caption(item: dict, limit: int = 2200, platform: str = "instagram") -> str:
    own = item.get("ig_caption") if platform == "instagram" else item.get("fb_description")
    text = str(own or item.get("caption") or item.get("description") or item.get("title") or "").strip()
    tags = hashtag_text(item.get("hashtags", [])[:30])
    if tags and tags not in text:
        text = (text + "\n\n" + tags).strip()
    return text[:limit]


def video_source(item: dict, cfg: dict) -> str:
    if item.get("video"):
        return str(item["video"]).strip()
    if item.get("file"):
        return cfg.get("media_base_url", "").rstrip("/") + "/" + urllib.parse.quote(str(item["file"]).lstrip("/"))
    raise ApiError("queue item has no 'video' or 'file'")


def is_url(src: str) -> bool:
    return src.lower().startswith(("https://", "http://"))


def norm_source(src: str) -> str:
    return src.strip().lower().rstrip("/")


# --------------------------------------------------------------------------- #
# Retry helper: one retry on a network error. `check` asks the platform
# "did the first try actually work?" before retrying, so a lost reply can
# never cause a double post.
# --------------------------------------------------------------------------- #
class Ctx:
    def __init__(self, cfg: dict, http, secrets: dict, sleep: Callable[[float], None]):
        self.cfg, self.http, self.secrets, self.sleep = cfg, http, secrets, sleep

    def retry_once(self, what: str, fn: Callable[[], Any], check: Optional[Callable[[], Any]] = None) -> Any:
        try:
            return fn()
        except NetworkError as e:
            log.warning("network problem during %s (%s); retrying once", what, e)
            self.sleep(self.cfg["retry_wait_seconds"])
            if check is not None:
                try:
                    done = check()
                except (NetworkError, ApiError):
                    done = None
                if done is not None:
                    log.info("%s had actually succeeded; not repeating it", what)
                    return done
            return fn()

    def graph(self, host_key: str = "graph.facebook.com") -> str:
        return f"https://{host_key}/{self.cfg['graph_api_version']}"


# --------------------------------------------------------------------------- #
# YouTube
# --------------------------------------------------------------------------- #
GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN = "https://oauth2.googleapis.com/token"
YT_SCOPE = "https://www.googleapis.com/auth/youtube.upload"
# videos.list/videos.update need this wider scope; only requested in private_then_publish mode.
YT_SCOPE_MANAGE = "https://www.googleapis.com/auth/youtube.force-ssl"
YT_VIDEOS = "https://www.googleapis.com/youtube/v3/videos"
YT_UPLOAD = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status"


def youtube_access_token(ctx: Ctx) -> str:
    s = ctx.secrets.get("youtube", {})
    for k in ("client_id", "client_secret", "refresh_token"):
        if not s.get(k):
            raise ApiError(f"secrets.json youtube.{k} is missing (run: python poster.py setup-help)")

    def call():
        r = ctx.http.request("POST", GOOGLE_TOKEN, {"Content-Type": "application/x-www-form-urlencoded"},
                             form({"grant_type": "refresh_token", "client_id": s["client_id"],
                                   "client_secret": s["client_secret"], "refresh_token": s["refresh_token"]}))
        if r.status == 400 and "invalid_grant" in r.text():
            raise ApiError("YouTube refresh token expired or revoked: run python poster.py youtube-auth again")
        tok = expect_ok(r, "YouTube token refresh").json().get("access_token")
        if not tok:
            raise ApiError("YouTube token refresh gave no access_token")
        REDACT.add(tok)
        return tok

    return ctx.retry_once("YouTube token refresh", call)


def get_local_file(ctx: Ctx, src: str, tmpdir: Path) -> Path:
    if is_url(src):
        if not src.lower().startswith("https://"):
            raise ApiError("video URL must be https")
        dest = tmpdir / "video.mp4"
        max_bytes = int(ctx.cfg["max_download_mb"]) * 1024 * 1024
        n = ctx.retry_once("video download", lambda: ctx.http.download(src, dest, max_bytes))
        log.info("downloaded video (%.1f MB)", n / 1e6)
        return dest
    p = resolve(Path(ctx.cfg["_base"]), src)
    if not p.is_file():
        raise ApiError(f"video file not found: {p}")
    return p


def ai_flag(cfg: dict, item: dict, platform: str) -> bool:
    """Item value wins, then <platform>.ai_generated, then the top-level ai_generated."""
    if item.get("ai_generated") is not None:
        return bool(item["ai_generated"])
    v = (cfg.get(platform) or {}).get("ai_generated")
    return bool(cfg.get("ai_generated") if v is None else v)


def yt_privacy_mode(cfg: dict) -> str:
    m = (cfg.get("youtube") or {}).get("privacy_mode", "public")
    if m not in ("public", "private_then_publish"):
        raise ApiError(f'config youtube.privacy_mode must be "public" or "private_then_publish", not {m!r}')
    return m


def youtube_metadata(ctx: Ctx, item: dict) -> dict:
    yc = ctx.cfg["youtube"]
    privacy = "private" if yt_privacy_mode(ctx.cfg) == "private_then_publish" else yc.get("privacy_status", "public")
    status = {
        "privacyStatus": privacy,
        "selfDeclaredMadeForKids": bool(yc.get("made_for_kids", False)),
        "embeddable": True,
    }
    if ai_flag(ctx.cfg, item, "youtube"):
        status["containsSyntheticMedia"] = True
    return {
        "snippet": {"title": yt_title(item), "description": yt_description(item),
                    "tags": yt_tags(item), "categoryId": str(yc.get("category_id", "27"))},
        "status": status,
    }


def post_youtube(ctx: Ctx, item: dict, src: str) -> dict:
    token = youtube_access_token(ctx)
    dl = cfg_path(ctx.cfg, "download_dir")
    dl.mkdir(parents=True, exist_ok=True)
    tmpdir = Path(tempfile.mkdtemp(prefix="yt_", dir=str(dl)))
    try:
        path = get_local_file(ctx, src, tmpdir)
        size = path.stat().st_size
        if size == 0:
            raise ApiError("video file is empty")
        meta = json.dumps(youtube_metadata(ctx, item)).encode("utf-8")
        auth = {"Authorization": f"Bearer {token}"}

        def start():
            r = ctx.http.request("POST", YT_UPLOAD, {**auth, "Content-Type": "application/json; charset=UTF-8",
                                                    "X-Upload-Content-Length": str(size),
                                                    "X-Upload-Content-Type": "video/*"}, meta)
            loc = expect_ok(r, "YouTube upload start").headers.get("location")
            if not loc:
                raise ApiError("YouTube did not return an upload URL")
            return loc

        # Starting a session twice is harmless: nothing is published until bytes are sent.
        upload_url = ctx.retry_once("YouTube upload start", start)

        def finished(resp: HttpResponse) -> Optional[dict]:
            if resp.status in (200, 201):
                vid = resp.json().get("id")
                if vid:
                    return {"platform_id": vid, "url": f"https://www.youtube.com/shorts/{vid}"}
            return None

        def send(offset: int = 0):
            with open(path, "rb") as f:
                f.seek(offset)
                headers = {**auth, "Content-Type": "video/*", "Content-Length": str(size - offset)}
                if offset:
                    headers["Content-Range"] = f"bytes {offset}-{size - 1}/{size}"
                r = ctx.http.request("PUT", upload_url, headers, f)
            res = finished(expect_ok(r, "YouTube upload"))
            if res is None:
                raise NetworkError(f"YouTube upload incomplete (HTTP {r.status})")
            return res

        def check_status():
            r = ctx.http.request("PUT", upload_url, {**auth, "Content-Length": "0", "Content-Range": f"bytes */{size}"}, b"")
            return finished(r)

        def resume():
            r = ctx.http.request("PUT", upload_url, {**auth, "Content-Length": "0", "Content-Range": f"bytes */{size}"}, b"")
            done = finished(r)
            if done:
                return done
            if r.status == 308:
                rng = r.headers.get("range", "")
                offset = int(rng.split("-")[-1]) + 1 if "-" in rng else 0
                return send(offset)
            expect_ok(r, "YouTube upload status")
            return send(0)

        try:
            return send(0)
        except NetworkError as e:
            log.warning("network problem during YouTube upload (%s); checking and resuming once", e)
            ctx.sleep(ctx.cfg["retry_wait_seconds"])
            try:
                done = check_status()
                if done:
                    log.info("YouTube upload had actually finished; not uploading again")
                    return done
            except NetworkError:
                pass
            return resume()
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


# --------------------------------------------------------------------------- #
# Instagram (Graph API, Reels from a public video_url)
# --------------------------------------------------------------------------- #
def post_instagram(ctx: Ctx, item: dict, src: str) -> dict:
    s = ctx.secrets.get("instagram", {})
    if not s.get("ig_user_id") or not s.get("access_token"):
        raise ApiError("secrets.json instagram.ig_user_id / access_token missing (run: python poster.py setup-help)")
    if not src.lower().startswith("https://"):
        raise ApiError("Instagram needs a public https video URL (a local file cannot be used)")
    base = ctx.graph(ctx.cfg.get("instagram_host", "graph.facebook.com"))
    tok, ig = s["access_token"], s["ig_user_id"]
    hdr = {"Content-Type": "application/x-www-form-urlencoded"}

    def create():
        r = ctx.http.request("POST", f"{base}/{ig}/media", hdr, form({
            "media_type": "REELS", "video_url": src, "caption": meta_caption(item),
            "share_to_feed": "true" if ctx.cfg["instagram"].get("share_to_feed", True) else "false",
            "access_token": tok}))
        cid = expect_ok(r, "Instagram container create").json().get("id")
        if not cid:
            raise ApiError("Instagram gave no container id")
        return cid

    # An unpublished container is harmless (it expires), so plain retry is safe here.
    cid = ctx.retry_once("Instagram container create", create)
    log.info("instagram container %s created, waiting for processing", cid)

    def status_code() -> str:
        r = ctx.http.request("GET", f"{base}/{cid}?" + urllib.parse.urlencode({"fields": "status_code,status", "access_token": tok}))
        return expect_ok(r, "Instagram status").json().get("status_code", "")

    waited = 0.0
    while True:
        code = ctx.retry_once("Instagram status check", status_code)
        if code == "FINISHED":
            break
        if code in ("ERROR", "EXPIRED"):
            raise ApiError(f"Instagram could not process the video (status {code}). Check it is 9:16 MP4, 3-90 s, and the URL is public")
        if code == "PUBLISHED":
            return {"platform_id": None, "url": None, "note": "container already published"}
        if waited >= ctx.cfg["max_wait_seconds"]:
            raise ApiError(f"Instagram still processing after {int(waited)} s (status {code or 'unknown'})")
        ctx.sleep(ctx.cfg["poll_interval_seconds"])
        waited += ctx.cfg["poll_interval_seconds"]

    def publish():
        r = ctx.http.request("POST", f"{base}/{ig}/media_publish", hdr, form({"creation_id": cid, "access_token": tok}))
        mid = expect_ok(r, "Instagram publish").json().get("id")
        if not mid:
            raise ApiError("Instagram publish gave no media id")
        return {"platform_id": mid}

    def already():
        return {"platform_id": None, "note": "published (reply was lost)"} if status_code() == "PUBLISHED" else None

    res = ctx.retry_once("Instagram publish", publish, check=already)
    res.setdefault("url", None)
    if res.get("platform_id"):
        try:
            r = ctx.http.request("GET", f"{base}/{res['platform_id']}?" + urllib.parse.urlencode({"fields": "permalink", "access_token": tok}))
            res["url"] = r.json().get("permalink") if r.status == 200 else None
        except NetworkError:
            pass
    return res


# --------------------------------------------------------------------------- #
# Facebook Page Reels (video_reels: start -> upload -> finish)
# --------------------------------------------------------------------------- #
def post_facebook(ctx: Ctx, item: dict, src: str) -> dict:
    s = ctx.secrets.get("facebook", {})
    if not s.get("page_id") or not s.get("page_access_token"):
        raise ApiError("secrets.json facebook.page_id / page_access_token missing (run: python poster.py setup-help)")
    ver = ctx.cfg["graph_api_version"]
    base = ctx.graph()
    tok, page = s["page_access_token"], s["page_id"]
    jh = {"Content-Type": "application/json"}

    def start():
        r = ctx.http.request("POST", f"{base}/{page}/video_reels", jh,
                             json.dumps({"upload_phase": "start", "access_token": tok}).encode())
        vid = expect_ok(r, "Facebook reel start").json().get("video_id")
        if not vid:
            raise ApiError("Facebook gave no video_id")
        return vid

    vid = ctx.retry_once("Facebook reel start", start)  # an unused session is harmless
    up_url = f"https://rupload.facebook.com/video-upload/{ver}/{vid}"

    def upload():
        if is_url(src):
            if not src.lower().startswith("https://"):
                raise ApiError("video URL must be https")
            r = ctx.http.request("POST", up_url, {"Authorization": f"OAuth {tok}", "file_url": src}, b"")
        else:
            p = resolve(Path(ctx.cfg["_base"]), src)
            if not p.is_file():
                raise ApiError(f"video file not found: {p}")
            with open(p, "rb") as f:
                r = ctx.http.request("POST", up_url, {"Authorization": f"OAuth {tok}", "offset": "0",
                                                      "file_size": str(p.stat().st_size),
                                                      "Content-Type": "application/octet-stream"}, f)
        body = expect_ok(r, "Facebook reel upload").json()
        if body.get("success") is False:
            raise ApiError(f"Facebook upload refused: {REDACT(body)}")
        return True

    ctx.retry_once("Facebook reel upload", upload)

    def get_status() -> dict:
        r = ctx.http.request("GET", f"{base}/{vid}?" + urllib.parse.urlencode({"fields": "status", "access_token": tok}))
        return expect_ok(r, "Facebook status").json().get("status", {}) or {}

    waited = 0.0
    while True:
        st = ctx.retry_once("Facebook status check", get_status)
        vs = st.get("video_status", "")
        up = (st.get("uploading_phase") or {}).get("status", "")
        if vs in ("error", "expired", "upload_failed") or up == "error":
            raise ApiError(f"Facebook rejected the upload (status {vs or up}). Is the URL public and the video 9:16, 3-90 s?")
        if vs in ("ready", "upload_complete", "processing") or up == "complete":
            break
        if waited >= ctx.cfg["max_wait_seconds"]:
            raise ApiError(f"Facebook upload not complete after {int(waited)} s (status {vs or 'unknown'})")
        ctx.sleep(ctx.cfg["poll_interval_seconds"])
        waited += ctx.cfg["poll_interval_seconds"]

    def finish():
        params = {"upload_phase": "finish", "video_id": vid, "video_state": "PUBLISHED",
                  "description": meta_caption(item, 5000, "facebook"), "access_token": tok}
        if item.get("title") or item.get("youtube_title"):
            params["title"] = str(item.get("title") or item.get("youtube_title"))[:255]
        if ai_flag(ctx.cfg, item, "facebook"):
            params["is_ai_generated"] = "true"
        r = ctx.http.request("POST", f"{base}/{page}/video_reels", {"Content-Type": "application/x-www-form-urlencoded"}, form(params))
        body = expect_ok(r, "Facebook reel publish").json()
        if not body.get("success", False):
            raise ApiError(f"Facebook publish did not succeed: {REDACT(body)}")
        return {"platform_id": vid, "url": f"https://www.facebook.com/reel/{vid}"}

    def already():
        st = get_status()
        pub = (st.get("publishing_phase") or {})
        if pub.get("status") == "complete" or pub.get("publish_status") in ("published", "scheduled"):
            return {"platform_id": vid, "url": f"https://www.facebook.com/reel/{vid}"}
        return None

    res = ctx.retry_once("Facebook reel publish", finish, check=already)

    # Short wait to catch processing errors; still processing at the end is fine.
    waited = 0.0
    while waited < ctx.cfg["max_wait_seconds"]:
        try:
            st = get_status()
        except NetworkError:
            break
        pub = st.get("publishing_phase") or {}
        proc = st.get("processing_phase") or {}
        if st.get("video_status") == "error" or proc.get("status") == "error" or pub.get("publish_status") == "error":
            raise ApiError(f"Facebook processing failed: {REDACT(proc.get('error') or pub.get('errors') or 'unknown')}")
        if pub.get("publish_status") == "published" or st.get("video_status") == "ready":
            break
        ctx.sleep(ctx.cfg["poll_interval_seconds"])
        waited += ctx.cfg["poll_interval_seconds"]
    return res


POSTERS = {"youtube": post_youtube, "instagram": post_instagram, "facebook": post_facebook}


# --------------------------------------------------------------------------- #
# Scheduler
# --------------------------------------------------------------------------- #
def parse_time(s: str, tz) -> dt.datetime:
    t = dt.datetime.fromisoformat(s)
    return t.replace(tzinfo=tz) if t.tzinfo is None else t


def platform_slots(cfg: dict, platform: str) -> list[str]:
    slots = cfg.get("slots", [])
    if isinstance(slots, dict):
        slots = slots.get(platform, [])
    out = []
    for sl in slots:
        h, m = str(sl).strip().split(":")
        out.append(f"{int(h):02d}:{int(m):02d}")
    return sorted(out)


class Poster:
    def __init__(self, cfg: dict, http=None, now: Optional[Callable[[], dt.datetime]] = None,
                 sleep: Callable[[float], None] = time.sleep):
        self.cfg = cfg
        self.http = http or Http(cfg["http_timeout_seconds"])
        self.now_fn = now or (lambda: dt.datetime.now().astimezone())
        self.sleep = sleep
        self.posted_path = cfg_path(cfg, "posted_file")
        self.queue_path = cfg_path(cfg, "queue_file")

    # -- records -------------------------------------------------------------
    def load_posted(self) -> list:
        return load_json_list(self.posted_path)

    def save_posted(self, recs: list) -> None:
        atomic_write_json(self.posted_path, recs)

    @staticmethod
    def blocked(recs: list, platform: str, item_id: str, src: str) -> Optional[dict]:
        ns = norm_source(src)
        for r in recs:
            if r.get("platform") == platform and r.get("status") in BLOCKING_STATUSES:
                if r.get("item_id") == item_id or norm_source(r.get("video", "")) == ns:
                    return r
        return None

    def used(self, recs: list, platform: str, now: dt.datetime) -> tuple[int, int]:
        """(posts counted today, posts in the last 24 h) for this platform."""
        today = day = 0
        for r in recs:
            if r.get("platform") != platform or r.get("status") not in ("posted", "pending"):
                continue
            try:
                t = parse_time(r["attempted_at"], now.tzinfo)
            except (KeyError, ValueError):
                continue
            if t.astimezone(now.tzinfo).date() == now.date():
                today += 1
            if now - t < dt.timedelta(hours=24):
                day += 1
        return today, day

    def allowed_now(self, recs: list, platform: str, now: dt.datetime) -> int:
        cap = min(int(self.cfg["daily_caps"].get(platform, 0)), platform_limit(self.cfg, platform))
        slots = platform_slots(self.cfg, platform)
        passed = sum(1 for s in slots if now.strftime("%H:%M") >= s)
        today, day = self.used(recs, platform, now)
        by_slot = min(cap, passed) - today
        by_hard = platform_limit(self.cfg, platform) - day
        return max(0, min(by_slot, by_hard, int(self.cfg["max_posts_per_run_per_platform"])))

    # -- main ----------------------------------------------------------------
    def run(self) -> dict:
        now = self.now_fn()
        secrets = load_secrets(cfg_path(self.cfg, "secrets_file"))
        ctx = Ctx(self.cfg, self.http, secrets, self.sleep)
        queue = load_json_list(self.queue_path)
        summary = {"posted": [], "failed": [], "skipped_platforms": []}
        self.limited = set()
        log.info("=== run started %s (%d items in queue) ===", now.isoformat(timespec="minutes"), len(queue))

        for platform in PLATFORMS:
            if platform not in self.cfg["enabled_platforms"]:
                continue
            needed = {"youtube": ("client_id", "client_secret", "refresh_token"),
                      "instagram": ("ig_user_id", "access_token"),
                      "facebook": ("page_id", "page_access_token")}[platform]
            if not all(secrets.get(platform, {}).get(k) for k in needed):
                log.warning("%s: skipped, tokens not set up yet (python poster.py setup-help)", platform)
                summary["skipped_platforms"].append(platform)
                continue
            recs = self.load_posted()
            allowed = self.allowed_now(recs, platform, now)
            if allowed <= 0:
                today, _ = self.used(recs, platform, now)
                log.info("%s: nothing due now (%d posted today, cap %s)", platform, today, self.cfg["daily_caps"].get(platform))
                continue
            attempts = 0
            order = list(reversed(queue)) if platform in self.cfg.get("reverse_order_platforms", []) else queue
            for item in order:
                if attempts >= allowed or platform in self.limited:
                    break
                if platform not in item.get("platforms", list(PLATFORMS)):
                    continue
                item_id = str(item.get("id", "")).strip()
                if not item_id:
                    log.warning("queue item without an id skipped: %s", REDACT(str(item)[:80]))
                    continue
                if item.get("not_before"):
                    try:
                        if parse_time(item["not_before"], now.tzinfo) > now:
                            continue
                    except ValueError:
                        log.warning("%s: bad not_before date, skipped", item_id)
                        continue
                try:
                    src = video_source(item, self.cfg)
                except ApiError as e:
                    log.warning("%s: %s", item_id, e)
                    continue
                recs = self.load_posted()
                if self.blocked(recs, platform, item_id, src):
                    continue
                attempts += 1
                self.post_one(ctx, platform, item, item_id, src, now, summary)
        log.info("=== run finished: %d posted, %d failed ===", len(summary["posted"]), len(summary["failed"]))
        return summary

    def post_one(self, ctx: Ctx, platform: str, item: dict, item_id: str, src: str, now: dt.datetime, summary: dict) -> None:
        recs = self.load_posted()
        rec = {"item_id": item_id, "platform": platform, "video": src, "status": "pending",
               "attempted_at": now.isoformat(timespec="seconds")}
        recs.append(rec)
        self.save_posted(recs)  # written BEFORE posting, so a crash can never lead to a double post
        log.info("%s: posting %s", platform, item_id)
        try:
            result = POSTERS[platform](ctx, item, src)
            rec.update(status="posted", platform_id=result.get("platform_id"), url=result.get("url"))
            if platform == "youtube" and yt_privacy_mode(self.cfg) == "private_then_publish":
                rec["yt_visibility"] = "private"  # publish-youtube flips it to public later
                rec["ai_label"] = ai_flag(self.cfg, item, "youtube")
            if result.get("note"):
                rec["note"] = result["note"]
            log.info("%s: POSTED %s %s", platform, item_id, result.get("url") or result.get("platform_id") or "")
            summary["posted"].append((platform, item_id))
        except (NetworkError, ApiError) as e:
            if any(m in str(e) for m in LIMIT_MARKERS):
                # Platform-side daily/rate limit: not this video's fault. Leave it to retry at a later slot.
                rec.update(status="deferred", error=REDACT(e)[:300])
                log.warning("%s: LIMIT hit, %s deferred to a later slot: %s", platform, item_id, str(e)[:200])
                self.limited.add(platform)
                rec["finished_at"] = self.now_fn().isoformat(timespec="seconds")
                recs = [r for r in self.load_posted() if not (r.get("item_id") == item_id and r.get("platform") == platform and r.get("status") == "pending" and r.get("attempted_at") == rec["attempted_at"])]
                self.save_posted(recs)  # deferred records are not kept: the video simply stays in the queue
                return
            rec.update(status="failed", error=REDACT(e)[:500])
            log.error("%s: FAILED %s: %s", platform, item_id, e)
            summary["failed"].append((platform, item_id))
        except Exception as e:  # anything unexpected: record it, keep going
            rec.update(status="failed", error=REDACT(f"{type(e).__name__}: {e}")[:500])
            log.exception("%s: FAILED %s (unexpected error)", platform, item_id)
            summary["failed"].append((platform, item_id))
        rec["finished_at"] = self.now_fn().isoformat(timespec="seconds")
        recs = [r for r in self.load_posted() if not (r.get("item_id") == item_id and r.get("platform") == platform and r.get("status") == "pending" and r.get("attempted_at") == rec["attempted_at"])]
        recs.append(rec)
        self.save_posted(recs)


# --------------------------------------------------------------------------- #
# Fake servers for dry-run and tests (no real network at all)
# --------------------------------------------------------------------------- #
class FakeHttp:
    """Pretends to be Google and Meta. Records every call. Faults can be injected."""

    def __init__(self, ig_polls: int = 1, fb_polls: int = 1):
        self.calls: list[dict] = []
        self.faults: list[dict] = []
        self.n = 0
        self.ig_polls, self.fb_polls = ig_polls, fb_polls
        self.ig: dict[str, dict] = {}
        self.fb: dict[str, dict] = {}
        self.yt_sessions: dict[str, dict] = {}
        self.published = {"youtube": 0, "instagram": 0, "facebook": 0}

    def add_fault(self, method: str, contains: str, times: int = 1, exc: Optional[Exception] = None,
                  response: Optional[HttpResponse] = None, after: bool = False, body_contains: str = "") -> None:
        """after=True: do the real work first, then 'lose' the reply (worst case for double posts)."""
        self.faults.append({"method": method, "contains": contains, "times": times, "exc": exc,
                            "response": response, "after": after, "body": body_contains})

    def _fault(self, method: str, url: str, body: Any = b"") -> Optional[dict]:
        b = body.decode("utf-8", "replace") if isinstance(body, (bytes, bytearray)) else str(body or "")
        for f in self.faults:
            if f["times"] > 0 and f["method"] == method and f["contains"] in url and f.get("body", "") in b:
                f["times"] -= 1
                return f
        return None

    def _id(self, prefix: str) -> str:
        self.n += 1
        return f"{prefix}{self.n}"

    def download(self, url: str, dest: Path, max_bytes: int) -> int:
        self.calls.append({"method": "DOWNLOAD", "url": url, "headers": {}, "body": b""})
        f = self._fault("DOWNLOAD", url)
        if f and f["exc"]:
            raise f["exc"]
        data = b"\x00\x00\x00\x18ftypmp42" + b"0" * 2048
        dest.write_bytes(data)
        return len(data)

    def request(self, method: str, url: str, headers: Optional[dict] = None, body: Any = None) -> HttpResponse:
        headers = headers or {}
        if hasattr(body, "read"):
            body = body.read()
        self.calls.append({"method": method, "url": url, "headers": dict(headers), "body": body or b""})
        f = self._fault(method, url, body)
        if f and not f["after"]:
            if f["exc"]:
                raise f["exc"]
            return f["response"]
        resp = self._route(method, url, headers, body or b"")
        if f and f["after"]:
            if f["exc"]:
                raise f["exc"]
            return f["response"]
        return resp

    def _route(self, method: str, url: str, headers: dict, body: bytes) -> HttpResponse:
        u = urllib.parse.urlsplit(url)
        q = dict(urllib.parse.parse_qsl(u.query))
        parts = [p for p in u.path.split("/") if p]
        b = body.decode("utf-8", "replace") if isinstance(body, (bytes, bytearray)) else str(body)
        fb_form = dict(urllib.parse.parse_qsl(b)) if b and not b.startswith("{") else {}
        fb_json = json.loads(b) if b.startswith("{") else {}

        if u.netloc == "oauth2.googleapis.com":
            return HttpResponse(200, {}, {"access_token": "ya29.FAKE-ACCESS-" + "x" * 30, "expires_in": 3599})
        if u.netloc == "www.googleapis.com" and method == "POST":
            sid = self._id("up")
            self.yt_sessions[sid] = {"done": False, "size": int(headers.get("X-Upload-Content-Length", "0"))}
            return HttpResponse(200, {"Location": f"https://www.googleapis.com/upload/youtube/v3/videos?upload_id={sid}"}, b"")
        if u.netloc == "www.googleapis.com" and method == "PUT":
            sess = self.yt_sessions[q["upload_id"]]
            if headers.get("Content-Range", "").startswith("bytes */"):
                if sess["done"]:
                    return HttpResponse(200, {}, {"id": sess["vid"]})
                return HttpResponse(308, {}, b"")
            if not sess["done"]:
                sess["done"], sess["vid"] = True, self._id("yt")
                self.published["youtube"] += 1
            return HttpResponse(200, {}, {"id": sess["vid"], "status": {"uploadStatus": "uploaded"}})
        if u.netloc == "rupload.facebook.com":
            vid = parts[-1]
            if vid in self.fb:
                self.fb[vid]["uploaded"] = True
            return HttpResponse(200, {}, {"success": True})
        if u.netloc.startswith("graph."):
            node = parts[1] if len(parts) > 1 else ""
            edge = parts[2] if len(parts) > 2 else ""
            if method == "POST" and edge == "media":
                cid = self._id("c")
                self.ig[cid] = {"polls": 0, "published": False}
                return HttpResponse(200, {}, {"id": cid})
            if method == "POST" and edge == "media_publish":
                c = self.ig.get(fb_form.get("creation_id", ""))
                if c is None:
                    return HttpResponse(400, {}, {"error": {"message": "bad creation_id"}})
                if c["published"]:
                    return HttpResponse(400, {}, {"error": {"message": "already published"}})
                c["published"] = True
                self.published["instagram"] += 1
                return HttpResponse(200, {}, {"id": self._id("m")})
            if method == "POST" and edge == "video_reels":
                phase = fb_json.get("upload_phase") or fb_form.get("upload_phase")
                if phase == "start":
                    vid = self._id("v")
                    self.fb[vid] = {"uploaded": False, "published": False}
                    return HttpResponse(200, {}, {"video_id": vid, "upload_url": f"https://rupload.facebook.com/video-upload/{vid}"})
                if phase == "finish":
                    v = self.fb.get(fb_form.get("video_id", ""))
                    if not v or not v["uploaded"]:
                        return HttpResponse(400, {}, {"error": {"message": "not uploaded"}})
                    if not v["published"]:
                        v["published"] = True
                        self.published["facebook"] += 1
                    return HttpResponse(200, {}, {"success": True})
            if method == "GET" and node in self.ig:
                c = self.ig[node]
                if c["published"]:
                    return HttpResponse(200, {}, {"status_code": "PUBLISHED"})
                c["polls"] += 1
                return HttpResponse(200, {}, {"status_code": "FINISHED" if c["polls"] >= self.ig_polls else "IN_PROGRESS"})
            if method == "GET" and node.startswith("m"):
                return HttpResponse(200, {}, {"permalink": f"https://www.instagram.com/reel/{node}/"})
            if method == "GET" and node in self.fb:
                v = self.fb[node]
                st = {"video_status": "upload_complete" if v["uploaded"] else "uploading",
                      "uploading_phase": {"status": "complete" if v["uploaded"] else "in_progress"},
                      "publishing_phase": {"status": "complete" if v["published"] else "not_started",
                                           "publish_status": "published" if v["published"] else "draft"}}
                if v["published"]:
                    st["video_status"] = "ready"
                return HttpResponse(200, {}, {"status": st, "id": node})
            if method == "GET":
                return HttpResponse(200, {}, {"id": node, "name": "Fake", "username": "fake"})
        return HttpResponse(404, {}, {"error": "fake server: unknown url"})


FAKE_SECRETS = {
    "youtube": {"client_id": "fake-client-id.apps.googleusercontent.com", "client_secret": "FAKE-CLIENT-SECRET-123456",
                "refresh_token": "1//FAKE-REFRESH-TOKEN-abcdefghijklmnopqrstuvwxyz"},
    "instagram": {"ig_user_id": "17841400000000000", "access_token": "EAAFAKEINSTAGRAMTOKEN0000000000000000"},
    "facebook": {"page_id": "100000000000000", "page_access_token": "EAAFAKEPAGETOKEN000000000000000000000"},
}


def dry_run(cfg: dict) -> int:
    print("DRY RUN: fake servers only. Nothing is posted, no real accounts are touched.\n")
    real_queue = load_json_list(cfg_path(cfg, "queue_file"))
    with tempfile.TemporaryDirectory(prefix="poster_dry_") as d:
        dcfg = dict(cfg)
        dcfg.update({"_base": d, "secrets_file": "secrets.json", "queue_file": "queue.json", "posted_file": "posted.json",
                     "log_file": "dry.log", "lock_file": "dry.lock", "download_dir": "dl",
                     "enabled_platforms": list(PLATFORMS), "retry_wait_seconds": 0})
        queue = real_queue or sample_queue()
        atomic_write_json(Path(d) / "queue.json", queue)
        save_secrets(Path(d) / "secrets.json", FAKE_SECRETS)
        setup_logging(Path(d) / "dry.log")
        fake = FakeHttp(ig_polls=2)
        fake.add_fault("PUT", "upload_id=", times=1, exc=NetworkError("simulated dropped connection"), after=True)
        fake.add_fault("POST", "/media_publish", times=1, exc=NetworkError("simulated timeout"))
        tz = dt.datetime.now().astimezone().tzinfo
        day = dt.datetime.now(tz).replace(hour=0, minute=0, second=0, microsecond=0)
        times = [day.replace(hour=h, minute=m) for h, m in ((8, 5), (12, 35), (23, 0))]
        clock = {"t": times[0]}
        p = Poster(dcfg, http=fake, now=lambda: clock["t"], sleep=lambda s: None)
        for t in times[:2]:
            clock["t"] = t
            print(f"\n--- pretend the time is {t.strftime('%H:%M')} ---")
            p.run()
        clock["t"] = times[2]
        print("\n--- pretend it is 23:00 and the scheduler runs many times: must stop at the daily caps ---")
        for _ in range(8):
            p.run()
        before = dict(fake.published)
        print("\n--- one more run: must post nothing new ---")
        p.run()
        recs = p.load_posted()
        logtext = (Path(d) / "dry.log").read_text(encoding="utf-8")
        leaked = [k for sec in FAKE_SECRETS.values() for k in sec.values() if len(k) > 15 and k in logtext + json.dumps(recs)]
        expected = {pl: min(int(cfg["daily_caps"].get(pl, 0)), len(platform_slots(dcfg, pl)), len(queue)) for pl in PLATFORMS}
        posted_recs = [(r["platform"], r["item_id"]) for r in recs if r.get("status") == "posted"]
        no_dupes = len(posted_recs) == len(set(posted_recs)) == sum(fake.published.values()) and fake.published == before
        ok = no_dupes and not leaked and fake.published == expected
        print("\nRESULT")
        for plat in PLATFORMS:
            print(f"  {plat:9s} posted {fake.published[plat]} (expected {expected[plat]}, cap {cfg['daily_caps'].get(plat)})")
        print(f"  double posts: {'none' if no_dupes else 'FOUND'}")
        print(f"  tokens in log/records: {'none' if not leaked else 'LEAKED'}")
        print("  dry run " + ("PASSED" if ok else "FAILED"))
    setup_logging(cfg_path(cfg, "log_file"))
    return 0 if ok else 1


def sample_queue() -> list:
    base = DEFAULT_CONFIG["media_base_url"]
    return [{"id": f"sample-{i}", "video": f"{base}sample-{i}.mp4", "title": f"Sample Surah lesson {i}",
             "description": "A short lesson from the Quran.", "tags": ["quran", "islam"],
             "hashtags": ["#Quran", "#Islam"], "platforms": list(PLATFORMS)} for i in range(1, 9)]


# --------------------------------------------------------------------------- #
# YouTube one-time sign-in (OAuth installed-app flow with PKCE, loopback redirect)
# --------------------------------------------------------------------------- #
def youtube_auth(cfg: dict, client=None, open_browser: Callable[[str], Any] = webbrowser.open, timeout: int = 300) -> int:
    spath = cfg_path(cfg, "secrets_file")
    data = load_secrets(spath)
    yt = data.get("youtube", {})
    if not yt.get("client_id") or not yt.get("client_secret"):
        print("First put youtube.client_id and youtube.client_secret into secrets.json (see: python poster.py setup-help).")
        return 1
    client = client or Http(cfg["http_timeout_seconds"])
    verifier = pysecrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    state = pysecrets.token_urlsafe(16)
    got: dict[str, str] = {}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            qs = dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(self.path).query))
            if "code" in qs or "error" in qs:
                got.update(qs)
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"<h2>Done. You can close this tab and go back to the black window.</h2>")

        def log_message(self, *a):
            pass

    srv = http.server.HTTPServer(("127.0.0.1", 0), Handler)
    srv.timeout = 5
    redirect = f"http://127.0.0.1:{srv.server_address[1]}"
    url = GOOGLE_AUTH + "?" + urllib.parse.urlencode({
        "client_id": yt["client_id"], "redirect_uri": redirect, "response_type": "code", "scope": YT_SCOPE + (" " + YT_SCOPE_MANAGE if yt_privacy_mode(cfg) == "private_then_publish" else ""),
        "access_type": "offline", "prompt": "consent", "state": state,
        "code_challenge": challenge, "code_challenge_method": "S256"})
    print("A Google sign-in page is opening in your browser.")
    print("Sign in with the Google account that owns the Sunset Surahs channel, pick the channel, press Allow.")
    print("If no page opens, copy this link into your browser:\n" + url + "\n")
    open_browser(url)
    end = time.time() + timeout
    try:
        while not got and time.time() < end:
            srv.handle_request()
    finally:
        srv.server_close()
    if not got:
        print("Timed out waiting for Google. Run the command again.")
        return 1
    if got.get("error") or got.get("state") != state:
        print(f"Google sign-in did not complete ({got.get('error', 'state mismatch')}). Run the command again.")
        return 1
    r = client.request("POST", GOOGLE_TOKEN, {"Content-Type": "application/x-www-form-urlencoded"}, form({
        "grant_type": "authorization_code", "code": got["code"], "client_id": yt["client_id"],
        "client_secret": yt["client_secret"], "redirect_uri": redirect, "code_verifier": verifier}))
    if r.status != 200:
        print(f"Google refused the code (HTTP {r.status}). Run the command again.")
        return 1
    tok = r.json()
    if not tok.get("refresh_token"):
        print("Google gave no refresh token. Remove this app at https://myaccount.google.com/permissions and run again.")
        return 1
    REDACT.add(tok.get("refresh_token"))
    yt["refresh_token"] = tok["refresh_token"]
    data["youtube"] = yt
    save_secrets(spath, data)
    print("Saved. The refresh token is now in secrets.json (not shown here). YouTube is ready.")
    return 0


# --------------------------------------------------------------------------- #
# publish-youtube: flip private uploads to public (videos.update, ~50 units each)
# --------------------------------------------------------------------------- #
def publish_youtube(cfg: dict, http=None) -> int:
    if yt_privacy_mode(cfg) != "private_then_publish":
        print('youtube.privacy_mode is "public": uploads are already public, nothing to do.')
        return 0
    path = cfg_path(cfg, "posted_file")
    recs = load_json_list(path)
    todo = [r for r in recs if r.get("platform") == "youtube" and r.get("status") == "posted"
            and r.get("yt_visibility") == "private" and r.get("platform_id")]
    if not todo:
        print("No private YouTube uploads waiting.")
        return 0
    secrets = load_secrets(cfg_path(cfg, "secrets_file"))
    ctx = Ctx(cfg, http or Http(cfg["http_timeout_seconds"]), secrets, time.sleep)
    try:
        token = youtube_access_token(ctx)
    except (ApiError, NetworkError) as e:
        print(f"YouTube: NOT READY - {REDACT(e)}")
        return 1
    auth = {"Authorization": f"Bearer {token}"}
    bad = 0
    for r in todo:
        vid = r["platform_id"]
        try:
            q = urllib.parse.urlencode({"part": "status,processingDetails", "id": vid})
            items = expect_ok(ctx.http.request("GET", f"{YT_VIDEOS}?{q}", auth), "YouTube video lookup").json().get("items") or []
            if not items:
                raise ApiError("video not found (deleted?)")
            st = items[0].get("status", {})
            proc = items[0].get("processingDetails", {}).get("processingStatus")
            if st.get("uploadStatus") != "processed" and proc != "succeeded":
                print(f"{vid}: still processing, try again later")
                continue
            if st.get("privacyStatus") == "public":
                r["yt_visibility"] = "public"
                continue
            # videos.update replaces the whole status part, so resend every field we set.
            body = {"id": vid, "status": {"privacyStatus": "public", "embeddable": True,
                    "selfDeclaredMadeForKids": bool(cfg["youtube"].get("made_for_kids", False))}}
            if st.get("containsSyntheticMedia") or r.get("ai_label"):
                body["status"]["containsSyntheticMedia"] = True
            resp = expect_ok(ctx.http.request("PUT", f"{YT_VIDEOS}?part=status", {**auth, "Content-Type": "application/json"},
                                              json.dumps(body).encode("utf-8")), "YouTube publish")
            now_priv = resp.json().get("status", {}).get("privacyStatus")
            if now_priv != "public":
                raise ApiError(f"YouTube kept the video {now_priv or 'not public'} (project may be locked to private)")
            r["yt_visibility"] = "public"
            print(f"{vid}: now public  {r.get('url', '')}")
        except (ApiError, NetworkError) as e:
            bad += 1
            print(f"{vid}: FAILED - {REDACT(e)}")
    atomic_write_json(path, recs)
    return 1 if bad else 0


# --------------------------------------------------------------------------- #
# check: read-only token test (real calls, posts nothing)
# --------------------------------------------------------------------------- #
def check_tokens(cfg: dict, http=None) -> int:
    spath = cfg_path(cfg, "secrets_file")
    if not spath.exists():
        print(f"NOT READY - {spath.name} not found. Copy secrets.example.json to {spath.name}, "
              "fill it in (python poster.py setup-help), then run check again.")
        return 1
    secrets = load_secrets(spath)
    ctx = Ctx(cfg, http or Http(cfg["http_timeout_seconds"]), secrets, time.sleep)
    bad = 0
    for name, fn in (("YouTube", lambda: youtube_access_token(ctx) and "token refresh works"),
                     ("Instagram", lambda: _graph_get(ctx, ctx.graph(cfg.get("instagram_host", "graph.facebook.com")),
                                                      secrets.get("instagram", {}).get("ig_user_id"),
                                                      secrets.get("instagram", {}).get("access_token"), "username")),
                     ("Facebook", lambda: _graph_get(ctx, ctx.graph(), secrets.get("facebook", {}).get("page_id"),
                                                     secrets.get("facebook", {}).get("page_access_token"), "name"))):
        try:
            print(f"{name}: OK ({fn()})")
        except (ApiError, NetworkError) as e:
            bad += 1
            print(f"{name}: NOT READY - {REDACT(e)}")
    return 1 if bad else 0


def _graph_get(ctx: Ctx, base: str, node: Optional[str], tok: Optional[str], field: str) -> str:
    if not node or not tok:
        raise ApiError("ID or token missing in secrets.json")
    r = ctx.http.request("GET", f"{base}/{node}?" + urllib.parse.urlencode({"fields": field, "access_token": tok}))
    return f"account: {expect_ok(r, 'lookup').json().get(field, '?')}"


# --------------------------------------------------------------------------- #
# setup-help, status, retry
# --------------------------------------------------------------------------- #
SETUP_HELP = """
WHAT YOU NEED (all free). Put each value into secrets.json (copy secrets.example.json
to secrets.json first). Never paste these into chats, screenshots or GitHub.

---------------------------------------------------------------------------
1) YOUTUBE  ->  secrets.json "youtube": client_id, client_secret, refresh_token
---------------------------------------------------------------------------
 a. Go to https://console.cloud.google.com/ and sign in with the channel's Google account.
 b. Top left, project picker -> NEW PROJECT -> name it "Sunset Surahs Poster" -> CREATE.
 c. Left menu -> APIs & Services -> Library -> search "YouTube Data API v3" -> ENABLE.
 d. Left menu -> APIs & Services -> OAuth consent screen (may be called "Google Auth
    Platform") -> External -> fill app name + your email -> add yourself as a Test user.
 e. IMPORTANT: on the consent screen page press PUBLISH APP (In production). While it is
    left "Testing", Google expires the refresh token after 7 days and posting stops.
    An unverified app is fine for your own channel; you just click "Advanced -> continue"
    on a warning screen during sign-in.
 f. Left menu -> Credentials -> + CREATE CREDENTIALS -> OAuth client ID ->
    Application type: Desktop app -> CREATE. Copy "Client ID" and "Client secret"
    into secrets.json -> "youtube".
 g. Run:  python poster.py youtube-auth   (a browser opens, sign in, press Allow).
    This fills in refresh_token for you.
 Limits: this script uploads at most youtube.max_per_day videos a day (default 6).
 Google's docs now list 100 uploads/day (1 unit each, own bucket); older docs said
 ~1,600 of 10,000 units per upload (= 6/day), so 6 is the safe setting either way.
 YouTube also has its own per-channel daily cap (number not published).

---------------------------------------------------------------------------
2) FACEBOOK PAGE  ->  secrets.json "facebook": page_id, page_access_token
---------------------------------------------------------------------------
 Needs: a Facebook Page for Sunset Surahs, where you are an admin.
 a. Go to https://developers.facebook.com/ -> My Apps -> Create App -> type "Business"
    (or "Other" -> "Business") -> name "Sunset Surahs Poster".
 b. Open https://developers.facebook.com/tools/explorer/ (Graph API Explorer).
    Top right: pick your app. "User or Page" -> Get User Access Token. Tick:
    pages_show_list, pages_read_engagement, pages_manage_posts,
    instagram_basic, instagram_content_publish, business_management -> Generate.
 c. Make it long-lived: open https://developers.facebook.com/tools/debug/accesstoken/
    paste the token -> Debug -> bottom: "Extend Access Token" (lasts ~60 days).
 d. Back in the Explorer, with the long-lived token, run:  me/accounts
    Find your Page: its "id" is page_id, its "access_token" is page_access_token.
    A Page token made from a long-lived user token normally does not expire.
 Limit: 30 Reels per rolling 24 h. Video: 9:16, 3-90 seconds, public.

---------------------------------------------------------------------------
3) INSTAGRAM  ->  secrets.json "instagram": ig_user_id, access_token
---------------------------------------------------------------------------
 Needs: the Instagram account switched to Professional (Business or Creator) and
 linked to the Facebook Page (Instagram app -> Settings -> Account type / Page).
 a. In the Graph API Explorer run:  <page_id>?fields=instagram_business_account
    The number inside instagram_business_account is ig_user_id.
 b. access_token: use the same Page access token from step 2d. If Instagram
    rejects it, use the long-lived user token from step 2c instead (that one
    expires after ~60 days and must be renewed).
 Limit: 50-100 posts per rolling 24 h. The video must be a public https URL
 (GitHub raw links work for this; local files cannot be used for Instagram).
 Not yet confirmed: whether Meta asks for App Review when you only post to your
 own accounts. Apps in Development mode usually work for accounts that have a role
 on the app. If you get a permissions error, that is the reason.

---------------------------------------------------------------------------
THEN
---------------------------------------------------------------------------
 python poster.py check      read-only test of all three (posts nothing)
 python poster.py dry-run    practice run with fake servers
 python poster.py run        the real thing (set it to run every 30-60 min)
"""


def show_status(cfg: dict) -> int:
    p = Poster(cfg, http=object())
    recs = p.load_posted()
    queue = load_json_list(p.queue_path)
    now = p.now_fn()
    for plat in PLATFORMS:
        today, day = p.used(recs, plat, now)
        waiting = sum(1 for it in queue if plat in it.get("platforms", list(PLATFORMS))
                      and it.get("id") and not p.blocked(recs, plat, str(it["id"]), _safe_src(it, cfg)))
        print(f"{plat:9s} today {today}/{cfg['daily_caps'].get(plat)}  last 24h {day}  waiting in queue {waiting}")
    problems = [r for r in recs if r.get("status") in ("failed", "pending")]
    if problems:
        print("\nNeeds a look:")
        for r in problems:
            print(f"  {r['status']:7s} {r['platform']:9s} {r['item_id']}  {r.get('error', 'run stopped mid-post: check the platform, then use retry if it is not there')}")
    return 0


def _safe_src(item: dict, cfg: dict) -> str:
    try:
        return video_source(item, cfg)
    except ApiError:
        return ""


def requeue_limit_failures(cfg: dict, min_age_hours: float = 2.0) -> int:
    """Added 21 Nov: YouTube's new-channel upload cap ("uploadLimitExceeded") is temporary.
    Drop those failed records once they are min_age_hours old so the item is tried again."""
    p = Poster(cfg, http=object())
    recs = p.load_posted()
    now = dt.datetime.now(dt.timezone.utc)
    keep, n = [], 0
    for r in recs:
        if r.get("status") == "failed" and "uploadLimitExceeded" in str(r.get("error", "")):
            try:
                t = dt.datetime.fromisoformat(str(r.get("attempted_at")))
                if now - t >= dt.timedelta(hours=min_age_hours):
                    n += 1
                    continue
            except (TypeError, ValueError):
                pass
        keep.append(r)
    if n:
        p.save_posted(keep)
        print(f"requeued {n} item(s) that hit YouTube's upload limit")
    return n


def retry_item(cfg: dict, item_id: str, platform: str) -> int:
    p = Poster(cfg, http=object())
    recs = p.load_posted()
    keep = [r for r in recs if not (r.get("item_id") == item_id and r.get("platform") == platform and r.get("status") in ("failed", "pending"))]
    if len(keep) == len(recs):
        print("Nothing to retry (no failed or stuck record for that id and platform).")
        return 1
    p.save_posted(keep)
    print(f"OK: {item_id} on {platform} will be tried again on the next run.")
    return 0


def import_queue(cfg: dict, meta_path: Path, order_path: Optional[Path] = None) -> int:
    """Turn queue_meta.json (+ optional queue_order.json) into queue.json.
    Keeps items already in queue.json; adds new ones (matched by id) in posting order."""
    meta = load_json_list(meta_path)
    order = load_json_list(order_path) if order_path and order_path.exists() else []
    stem = lambda f: re.split(r"[\\/]", str(f))[-1]
    rank = {stem(o["file"]): o.get("position", i) for i, o in enumerate(order) if o.get("file")}
    meta.sort(key=lambda m: rank.get(stem(m.get("file", "")), 10_000))
    qpath = cfg_path(cfg, "queue_file")
    queue = load_json_list(qpath)
    have = {str(q.get("id")) for q in queue}
    added = 0
    for m in meta:
        name = stem(m.get("file", ""))
        if not name:
            continue
        item_id = re.sub(r"\.[A-Za-z0-9]+$", "", name)
        if item_id in have:
            continue
        item = {"id": item_id, "file": name, "platforms": list(PLATFORMS)}
        for k in ("youtube_title", "youtube_description", "ig_caption", "fb_description", "series"):
            if m.get(k):
                item[k] = m[k]
        queue.append(item)
        have.add(item_id)
        added += 1
    atomic_write_json(qpath, queue)
    print(f"Added {added} videos to {qpath.name} ({len(queue)} total). Each video must be uploaded to "
          f"{cfg.get('media_base_url')} with the same file name before it is due.")
    return 0


def main(argv: Optional[list] = None) -> int:
    ap = argparse.ArgumentParser(description="Sunset Surahs auto-poster")
    ap.add_argument("--config", default=str(BASE_DIR / "config.json"))
    sub = ap.add_subparsers(dest="cmd", required=True)
    for c in ("run", "dry-run", "status", "setup-help", "youtube-auth", "check", "publish-youtube"):
        sub.add_parser(c)
    iq = sub.add_parser("import-queue")
    iq.add_argument("meta_file")
    iq.add_argument("order_file", nargs="?")
    r = sub.add_parser("retry")
    r.add_argument("item_id")
    r.add_argument("platform", choices=PLATFORMS)
    args = ap.parse_args(argv)

    if args.cmd == "setup-help":
        print(SETUP_HELP)
        return 0
    cfg = load_config(Path(args.config))
    setup_logging(cfg_path(cfg, "log_file"))
    if args.cmd == "dry-run":
        return dry_run(cfg)
    if args.cmd == "status":
        return show_status(cfg)
    if args.cmd == "retry":
        return retry_item(cfg, args.item_id, args.platform)
    if args.cmd == "import-queue":
        return import_queue(cfg, Path(args.meta_file), Path(args.order_file) if args.order_file else None)
    if args.cmd == "youtube-auth":
        return youtube_auth(cfg)
    if args.cmd == "check":
        return check_tokens(cfg)
    if args.cmd == "publish-youtube":
        return publish_youtube(cfg)
    if args.cmd == "run":
        try:
            requeue_limit_failures(cfg)
        except Exception as e:  # never block a run on this
            print(f"requeue skipped: {e}")
    try:
        with Lock(cfg_path(cfg, "lock_file")):
            s = Poster(cfg).run()
    except RuntimeError as e:
        log.error("%s", e)
        return 2
    return 1 if s["failed"] else 0


if __name__ == "__main__":
    sys.exit(main())
