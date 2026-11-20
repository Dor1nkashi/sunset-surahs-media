// render_queue.mjs  — run on the laptop from studio/:   node tools/render_queue.mjs [--once]
// Finds every film folder containing a file named READY (and no DONE), renders each format in its film.json
// (hardware WebGL via Edge), masters the voice with mix.mjs, and copies the results to
// ..\..\Finished\v5\<meta name>.mp4 (9x16) and <meta name>_16x9.mp4. Writes DONE (or FAILED with the error) in the film folder.
// Loops every 60 s until a file named QUEUE_STOP exists in studio/ (or once with --once). Log: out/render_queue.log
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const FIN = path.resolve(ROOT, '..', '..', 'Finished', 'v5');
const LOG = path.join(ROOT, 'out', 'render_queue.log');
fs.mkdirSync(path.dirname(LOG), { recursive: true });
fs.mkdirSync(FIN, { recursive: true });
const env = { ...process.env, PW_CHANNEL: 'msedge', MR_GL_ARGS: '--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist' };
const log = (m) => { const l = `${new Date().toISOString().slice(0, 19)} ${m}`; fs.appendFileSync(LOG, l + '\n'); console.log(l); };

function run(args) {
  const r = spawnSync('node', args, { cwd: ROOT, env, encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`${args.join(' ')}: ${(r.stderr || r.stdout || '').trim().split('\n').slice(-3).join(' | ')}`);
  return r.stdout;
}

function one(film, fmt) {
  const dir = path.join(ROOT, film);
  const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'film.json'), 'utf8'));
  const linesPath = path.join(dir, 'lines.json');
  const name = fs.existsSync(linesPath) ? JSON.parse(fs.readFileSync(linesPath, 'utf8')).meta?.name || film : film;
  const t0 = Date.now();
  log(`${film} start ${fmt} (${cfg.duration} s)`);
  run(['scripts/render.mjs', '--film', film, '--format', fmt, '--video-only', '--workers', '4', '--fps', '30']);
  run(['scripts/mix.mjs', film]);
  const out = path.join(ROOT, 'out', film);
  const src = fmt === cfg.formats[0] ? path.join(out, 'final.mp4') : path.join(out, `final_${fmt}.mp4`);
  if (!fs.existsSync(src)) throw new Error(`${path.basename(src)} missing after mix`);
  // Dead-frame gate: refuse finals with black/empty stretches (audit 20 Nov: k18_06 black 16-32 s).
  const bd = spawnSync('ffmpeg', ['-hide_banner', '-i', src, '-vf', 'blackdetect=d=0.25:pic_th=0.97:pix_th=0.06', '-an', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const spans = [...(bd.stderr || '').matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map((m) => [+m[1], +m[2]]);
  const bad = spans.filter(([a, b]) => a > 0.3 && b < cfg.duration - 1.3);
  if (bad.length) throw new Error(`black frames at ${bad.map(([a, b]) => `${a.toFixed(1)}-${b.toFixed(1)}s`).join(', ')} (not copied to Finished)`);
  fs.copyFileSync(src, path.join(FIN, fmt === '9x16' ? `${name}.mp4` : `${name}_${fmt}.mp4`));
  fs.writeFileSync(path.join(dir, `DONE_${fmt}`), new Date().toISOString());
  if (cfg.formats.every((f) => fs.existsSync(path.join(dir, `DONE_${f}`)))) fs.writeFileSync(path.join(dir, 'DONE'), new Date().toISOString());
  log(`${film} ${fmt} DONE in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}

// Shorts first: every READY film's 9x16 before any 16x9 (long-form chapters).
function nextJob() {
  const films = fs.readdirSync(ROOT).filter((d) => fs.existsSync(path.join(ROOT, d, 'READY')) && !fs.existsSync(path.join(ROOT, d, 'DONE')) && !fs.existsSync(path.join(ROOT, d, 'FAILED'))).sort();
  for (const pass of ['9x16', '16x9']) for (const film of films) {
    const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, film, 'film.json'), 'utf8'));
    if (cfg.formats.includes(pass) && !fs.existsSync(path.join(ROOT, film, `DONE_${pass}`))) return [film, pass];
  }
  return null;
}

const once = process.argv.includes('--once');
for (;;) {
  if (fs.existsSync(path.join(ROOT, 'QUEUE_STOP'))) { log('stop file found'); break; }
  spawnSync('git', ['-C', '..', 'pull', '-q'], { env: { ...env, GIT_TERMINAL_PROMPT: '0' } });
  for (let job = nextJob(); job; job = nextJob()) {
    if (fs.existsSync(path.join(ROOT, 'QUEUE_STOP'))) break;
    const [film, fmt] = job;
    try { one(film, fmt); } catch (e) { log(`${film} ${fmt} FAILED ${e.message}`); fs.writeFileSync(path.join(ROOT, film, 'FAILED'), String(e.message)); }
    spawnSync('git', ['-C', '..', 'pull', '-q'], { env: { ...env, GIT_TERMINAL_PROMPT: '0' } });
  }
  if (once) break;
  await new Promise((r) => setTimeout(r, 60000));
}
