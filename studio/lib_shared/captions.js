// captions.js: closed-caption style captions for Sunset Surahs films (generalised from s14-good-word).
//
// One caption at a time, at most two rows, centred in the format's safe area. 2-3 key words per line
// in gold (from the line's `keys`), Quran lines in the verse face with a gold source chip ("YŪSUF 12:15").
// Long spoken lines are split into short chunks timed by character count, so the screen never shows a
// paragraph. Pure function of t: draw(ctx, t) paints the caption for time t (or nothing).
//
//   import { captions, loadLines } from '../lib_shared/captions.js';
//   const CAP = captions(await loadLines('lines.json'), { display: 'Display', ui: 'UI' });
//   draw(ctx, u, t) { ...; CAP.draw(ctx, t); }
//
// lines.json (made by tools/new_lesson.py): { duration, lines: [{ id, kind, t0, t1, text, keys: [..],
// quran: { ref: '12:15', surah: 'Yusuf', ar } | null }] }. Plain arrays [t0, t1, '*key* text', label]
// (the s14 shape) are accepted too.

export const GOLD = '#FFD15C';
const SURAH = { Yusuf: 'Yūsuf', Ibrahim: 'Ibrāhīm', Baqarah: 'Al-Baqarah', 'Al-Baqarah': 'Al-Baqarah' };
// safe areas [left, top, right, bottom] per format, same table as lib/motion.js
const SAFE = { '16x9': [96, 60, 96, 60], '9x16': [72, 250, 150, 430], '1x1': [72, 72, 72, 72] };
const fmtOf = (W, H) => (W > H ? '16x9' : W < H ? '9x16' : '1x1');
const norm = (w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9']/g, '');

export async function loadLines(url = 'lines.json') { const j = await (await fetch(url)).json(); return j.lines || j; }

// lines -> caption chunks [{ t0, t1, words: [{ w, key }], label, quran }]
export function chunk(lines, { maxChars = 34, maxKeys = 3, gap = 0.06 } = {}) {
  const out = [];
  for (const L of lines) {
    let t0, t1, text, keys, quran = null, label = null;
    if (Array.isArray(L)) { [t0, t1, text, label] = L; keys = []; }
    else { ({ t0, t1, text } = L); keys = (L.keys || []).slice(0, maxKeys).map(norm); quran = L.quran || null;
      if (quran) label = `${SURAH[quran.surah] || quran.surah || ''} ${quran.ref}`.trim(); }
    const used = new Set();
    const words = text.split(/\s+/).filter(Boolean).map((w) => {
      let key = w.includes('*'); w = w.replace(/\*/g, '');
      const n = norm(w); if (!key && n && keys.includes(n) && !used.has(n)) { key = true; used.add(n); }
      return { w, key };
    });
    // split into chunks of <= maxChars, preferring breaks after punctuation
    const groups = []; let cur = [];
    const len = (g) => g.map((x) => x.w).join(' ').length;
    words.forEach((x, i) => {
      cur.push(x);
      const soft = /[,;:.!?]$/.test(x.w) && len(cur) > maxChars * 0.45, hard = i < words.length - 1 && len([...cur, words[i + 1]]) > maxChars;
      if (soft || hard) { groups.push(cur); cur = []; }
    });
    if (cur.length) { if (groups.length && len(cur) < 9) groups[groups.length - 1].push(...cur); else groups.push(cur); }
    const total = groups.reduce((a, g) => a + len(g) + 4, 0);
    let t = t0;
    groups.forEach((g, gi) => { const d = (t1 - t0) * (len(g) + 4) / total;
      out.push({ t0: t, t1: gi === groups.length - 1 ? t1 : t + d - gap, words: g, label, quran }); t += d; });
  }
  return out;
}

// opts: display/ui font families, verse face (defaults to ui), sizes per format, y anchor (fraction of H)
export function captions(lines, { display = 'Display', ui = 'UI', verse = null, gold = GOLD, y = null, size = null, chip = true, fadeIn = 0.12, fadeOut = 0.1 } = {}) {
  const C = chunk(lines);
  function draw(ctx, t) {
    const c = C.find((x) => t >= x.t0 && t < x.t1);
    if (!c) return;
    const W = ctx.canvas.width, H = ctx.canvas.height, F = fmtOf(W, H), [sl, st, sr, sb] = SAFE[F];
    const k = Math.min(1, (t - c.t0) / fadeIn, (c.t1 - t) / fadeOut);
    if (k <= 0) return;
    const q = !!c.label, base = size ?? { '9x16': 76, '16x9': 64, '1x1': 64 }[F], sz = q ? Math.round(base * 0.86) : base;
    const fam = q ? (verse || ui) : display, wt = q ? 600 : 800, f = `${wt} ${sz}px ${fam}`;
    ctx.save(); ctx.globalAlpha = k; ctx.font = f; ctx.textBaseline = 'alphabetic';
    const maxW = (W - sl - sr) * (F === '16x9' ? 0.7 : 0.94), cx = sl + (W - sl - sr) / 2;
    const rows = [[]];
    for (const x of c.words) { const R = rows[rows.length - 1], test = [...R, x].map((o) => o.w).join(' ');
      if (R.length && ctx.measureText(test).width > maxW) rows.push([x]); else R.push(x); }
    const lh = sz * 1.18, yA = y ?? { '9x16': 0.70, '16x9': 0.84, '1x1': 0.80 }[F];
    const yMax = H - sb - (rows.length - 1) * lh - 8;
    const y0 = Math.min(H * yA - (rows.length - 1) * lh / 2, yMax) + (1 - k) * 14;
    // soft band behind the text so it reads over bright skies
    const bandTop = y0 - sz - (q && chip ? 80 : 30), bandH = rows.length * lh + (q && chip ? 110 : 60);
    const g = ctx.createLinearGradient(0, bandTop, 0, bandTop + bandH);
    g.addColorStop(0, 'rgba(10,6,2,0)'); g.addColorStop(0.5, 'rgba(10,6,2,0.34)'); g.addColorStop(1, 'rgba(10,6,2,0)');
    ctx.fillStyle = g; ctx.fillRect(0, bandTop, W, bandH);
    if (q && chip) {
      const lab = c.label.toUpperCase(); ctx.font = `600 ${Math.round(sz * 0.4)}px ${display}`;
      const cw = ctx.measureText(lab).width + 44, cy = y0 - sz - 30, ch = Math.round(sz * 0.6);
      ctx.beginPath(); ctx.roundRect(cx - cw / 2, cy - ch * 0.72, cw, ch, ch / 2); ctx.fillStyle = 'rgba(255,209,92,0.92)'; ctx.fill();
      ctx.fillStyle = '#3a2508'; ctx.textAlign = 'center'; ctx.fillText(lab, cx, cy); ctx.font = f;
    }
    ctx.textAlign = 'left';
    rows.forEach((R, ri) => {
      const total = ctx.measureText(R.map((o) => o.w).join(' ')).width; let x = cx - total / 2; const yy = y0 + ri * lh;
      R.forEach((o, wi) => {
        ctx.lineJoin = 'round'; ctx.lineWidth = Math.round(sz * 0.13); ctx.strokeStyle = 'rgba(20,10,4,0.55)'; ctx.strokeText(o.w, x, yy);
        ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
        ctx.fillStyle = o.key ? gold : '#FFFFFF'; ctx.fillText(o.w, x, yy); ctx.shadowColor = 'transparent';
        x += ctx.measureText(o.w + (wi < R.length - 1 ? ' ' : '')).width;
      });
    });
    ctx.restore();
  }
  return { draw, chunks: C, fonts: [`800 76px ${display}`, `600 64px ${verse || ui}`, `600 30px ${display}`] };
}
