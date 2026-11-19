"""new_lesson.py <series> <NN> [--force]      e.g.  python3 tools/new_lesson.py y12 03     (run from studio/)

Scaffolds a lesson film folder studio/<series>-<NN>/ from the voice files in voice/<series>/:
  film.json (duration = last line end + 1.6 s for the logo fade; formats 9x16 then 16x9), beats.json (120 bpm grid, no music),
  index.html, lib/ (motion.js, gl.js), fonts/, assets/seal.png, audio/vo.wav, and lines.json — everything film.js needs for captions:
  [{id, kind, t0, t1, text (shown text), keys: [gold words], quran: {ref, surah} | null}].
Never overwrites an existing film folder unless --force (film.js is never overwritten)."""
import importlib.util, json, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / 's14-good-word'
QUOTES = Path('/home/claude/sunset/eng/build')          # cloud only; on the laptop lines.json is already in git


def shown(text):
    return ' '.join(x for x in ((t.split('|', 1)[1] if '|' in t else t) for t in text.split(' ')) if x)


def quotes():
    q = json.loads((QUOTES / 'quotes.json').read_text(encoding='utf-8'))
    for k, d in json.loads((QUOTES / 'quotes_v4.json').read_text(encoding='utf-8')).items():
        p = q[d['of']]
        q[k] = {'ref': p['ref'], 'surah': p.get('surah'), 'en': ' '.join(p['en'].split(' ')[d['en'][0]:d['en'][1]]), 'ar': p.get('ar')}
    return q


def main():
    series, nn = sys.argv[1], sys.argv[2]
    force = '--force' in sys.argv
    vdir = ROOT / 'voice' / series
    name = f'script_{series}_{nn}'
    spec = importlib.util.spec_from_file_location(name, vdir / f'{name}.py')
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    timing = {d['id']: d for d in json.loads((vdir / f'{name}.json').read_text(encoding='utf-8'))}
    Q = quotes()
    keys = getattr(m, 'KEYS', {})
    lines = []
    for lid, kind, text in m.LINES:
        c = m.CHECK.get(lid)
        quran = None
        if c and c[0] == 'quran':
            e = Q[c[1]]
            quran = {'ref': e['ref'], 'surah': e.get('surah'), 'ar': e.get('ar')}
        lines.append({'id': lid, 'kind': kind, 't0': timing[lid]['t0'], 't1': timing[lid]['t1'],
                      'text': shown(text), 'keys': keys.get(lid, []), 'quran': quran})
    dur = round(lines[-1]['t1'] + 1.6, 2)
    out = ROOT / f'{series}-{nn}'
    if out.exists() and not force:
        print(f'{out.name} exists (use --force to refresh its data files)'); return
    out.mkdir(exist_ok=True)
    for sub in ('lib', 'fonts'):
        shutil.copytree(TEMPLATE / sub, out / sub, dirs_exist_ok=True)
    (out / 'assets').mkdir(exist_ok=True); shutil.copy(TEMPLATE / 'assets' / 'seal.png', out / 'assets' / 'seal.png')
    (out / 'audio').mkdir(exist_ok=True); shutil.copy(vdir / f'{name}.wav', out / 'audio' / 'vo.wav')
    title = m.META.get('title', name)
    (out / 'film.json').write_text(json.dumps({'title': title, 'duration': dur, 'formats': ['9x16', '16x9'],
                                               'poster': round(dur * 0.45, 1)}, indent=1), encoding='utf-8')
    beats = [round(i * 0.5, 3) for i in range(int(dur / 0.5) + 2)]
    (out / 'beats.json').write_text(json.dumps({'bpm': 120, 'period': 0.5, 'offset': 0.0, 'beats': beats,
                                                'downbeats': beats[::4], 'sections': [], 'energy': []}), encoding='utf-8')
    html = (TEMPLATE / 'index.html').read_text(encoding='utf-8').replace('<title>One Good Word</title>', f'<title>{title}</title>')
    (out / 'index.html').write_text(html, encoding='utf-8')
    (out / 'lines.json').write_text(json.dumps({'title': title, 'meta': m.META, 'duration': dur, 'lines': lines},
                                               indent=1, ensure_ascii=False), encoding='utf-8')
    print(f'{out.name}: {dur} s, {len(lines)} lines -> {out}')


if __name__ == '__main__':
    main()
