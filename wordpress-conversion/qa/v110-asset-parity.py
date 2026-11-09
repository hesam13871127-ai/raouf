#!/usr/bin/env python3
"""Confirm the correction changed only functional code, not design assets."""
import difflib
import hashlib
import json
from pathlib import Path

ROOT = Path('/home/user/raouf')
OLD = ROOT / 'wordpress-conversion' / 'theme' / 'raouf-academy'
NEW = ROOT / 'wordpress-conversion' / 'theme-v1.1.0' / 'raouf-academy'
OUT = ROOT / 'wordpress-conversion' / 'qa' / 'results' / 'v110-asset-parity.json'
BALAD = 'https://balad.ir/p/29UbcoR7CtjsIN'

def files(base):
    return {p.relative_to(base).as_posix(): p for p in base.rglob('*') if p.is_file()}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

old = files(OLD)
new = files(NEW)
checks = []
def check(name, ok, detail=''):
    checks.append({'name': name, 'result': 'PASS' if ok else 'FAIL', 'detail': str(detail)[:600]})

check('same runtime file set', set(old) == set(new), {'old': len(old), 'new': len(new),
      'only_old': sorted(set(old) - set(new)), 'only_new': sorted(set(new) - set(old))})
changed = sorted(k for k in old if sha(old[k]) != sha(new[k]))
expected_changed = {
    'style.css', 'functions.php', 'readme.txt', 'inc/helpers.php', 'inc/options.php',
    'inc/forms.php', 'inc/pages-data.php', 'footer.php', 'assets/js/app.js',
}
check('only the 9 intended functional/version files changed', set(changed) == expected_changed,
      {'changed': changed, 'expected': sorted(expected_changed)})

asset_ext = {'.woff2', '.webp', '.jpg', '.jpeg', '.png', '.svg', '.gif', '.ico'}
assets = [k for k in old if Path(k).suffix.lower() in asset_ext]
bad_assets = [k for k in assets if sha(old[k]) != sha(new[k])]
check('all images, fonts and SVG assets are byte-identical', not bad_assets,
      {'assets': len(assets), 'changed': bad_assets})

css_source = 'assets/css/style.css.source.css'
check('reference CSS source is byte-identical', sha(old[css_source]) == sha(new[css_source]), css_source)

old_css = old['style.css'].read_text(encoding='utf8')
new_css = new['style.css'].read_text(encoding='utf8')
marker = '*/'
old_rules = old_css[old_css.index(marker) + len(marker):]
new_rules = new_css[new_css.index(marker) + len(marker):]
check('style.css design rules are byte-identical; only header Version changed',
      old_rules == new_rules and 'Version: 1.0.0' in old_css and 'Version: 1.1.0' in new_css,
      {'old_rules_sha': sha(old['style.css']), 'new_rules_equal': old_rules == new_rules})

old_js = old['assets/js/app.js'].read_text(encoding='utf8').splitlines()
new_js = new['assets/js/app.js'].read_text(encoding='utf8').splitlines()
sm = difflib.SequenceMatcher(None, old_js, new_js)
changed_spans = [(i1 + 1, i2) for tag, i1, i2, j1, j2 in sm.get_opcodes() if tag != 'equal']
js_ok = all(180 <= start <= 350 and 180 <= end <= 350 for start, end in changed_spans)
check('app.js edits are confined to the form/AJAX section (lines 180–350)', js_ok, changed_spans)

for rel in ['inc/pages-data.php', 'footer.php']:
    restored = new[rel].read_text(encoding='utf8').replace(BALAD, '{{MAP_URL}}')
    check(f'{rel} differs only by the official map destination',
          restored == old[rel].read_text(encoding='utf8'),
          {'balad_occurrences': new[rel].read_text(encoding='utf8').count(BALAD)})

php_osm = []
for rel, p in new.items():
    if p.suffix == '.php' and 'openstreetmap.org/search?query=' in p.read_text(encoding='utf8', errors='replace'):
        php_osm.append(rel)
check('no public OpenStreetMap destination remains in theme PHP',
      php_osm == ['inc/helpers.php'], {'files_with_legacy_detection_string': php_osm})

summary = {
    'checks': len(checks),
    'PASS': sum(1 for c in checks if c['result'] == 'PASS'),
    'FAIL': sum(1 for c in checks if c['result'] == 'FAIL'),
    'runtime_files': len(new),
    'changed_files': changed,
    'unchanged_assets': len(assets) - len(bad_assets),
}
out = {'stage': 'v1.1.0-asset-parity', 'summary': summary, 'checks': checks}
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf8')
for c in checks:
    print(c['result'], c['name'], '::', c['detail'])
print('summary', summary, 'written to', OUT)
raise SystemExit(0 if summary['FAIL'] == 0 else 1)
