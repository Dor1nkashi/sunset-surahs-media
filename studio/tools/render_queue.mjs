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

function one(film) {
  const dir = path.join(ROOT, film);
  const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'film.json'), 'utf8'));
  const linesPath = path.join(dir, 'lines.json');
  const name = fs.existsSync(linesPath) ? JSON.parse(fs.readFileSync(linesPath, 'utf8')).meta?.name || film : film;
  const t0 = Date.now();
  log(`${film} start (${cfg.formats.join(', ')}, ${cfg.duration} s)`);
  for (const f of cfg.formats) run(['scripts/render.mjs', '--film', film, '--format', f, '--video-only', '--workers', '4', '--fps', '30']);
  run(['scripts/mix.mjs', film]);
  const out = path.join(ROOT, 'out', film);
  const primary = path.join(out, 'final.mp4');
  if (!fs.existsSync(primary)) throw new Error('final.mp4 missing after mix');
  fs.copyFileSync(primary, path.join(FIN, `${name}.mp4`));
  for (const f of cfg.formats.slice(1)) {
    const p = path.join(out, `final_${f}.mp4`);
    if (fs.existsSync(p)) fs.copyFileSync(p, path.join(FIN, `${name}_${f}.mp4`));
  }
  fs.writeFileSync(path.join(dir, 'DONE'), new Date().toISOString());
  log(`${film} DONE in ${((Date.now() - t0) / 60000).toFixed(1)} min -> ${FIN}\\${name}.mp4`);
}

const once = process.argv.includes('--once');
for (;;) {
  if (fs.existsSync(path.join(ROOT, 'QUEUE_STOP'))) { log('stop file found'); break; }
  spawnSync('git', ['-C', '..', 'pull', '-q'], { env: { ...env, GIT_TERMINAL_PROMPT: '0' } });
  const films = fs.readdirSync(ROOT).filter((d) => fs.existsSync(path.join(ROOT, d, 'READY')) && !fs.existsSync(path.join(ROOT, d, 'DONE')) && !fs.existsSync(path.join(ROOT, d, 'FAILED'))).sort();
  for (const film of films) {
    try { one(film); } catch (e) { log(`${film} FAILED ${e.message}`); fs.writeFileSync(path.join(ROOT, film, 'FAILED'), String(e.message)); }
  }
  if (once) break;
  await new Promise((r) => setTimeout(r, 60000));
}
