#!/usr/bin/env python3
"""Correction v1.1.0 — strict 66-pair visual/DOM parity on 11 routes x 6 viewports."""
import json
import os
import re
import subprocess
from pathlib import Path

ROOT = Path('/home/user/raouf')
SCREEN = ROOT / '.work' / 'wp-qa' / 'v110-screens'
OUT = ROOT / 'wordpress-conversion' / 'qa' / 'results' / 'v110-visual.json'
report = json.loads((SCREEN / 'capture-report.json').read_text(encoding='utf8'))

def metric(args):
    r = subprocess.run(['compare'] + args + ['null:'], capture_output=True, text=True)
    return (r.stderr.strip() or r.stdout.strip()).split(' ')[0]

def is_zero(v):
    return v.split('(')[0] in ('0', '0.0', '0.0000')

rows = []
for pair in report['pairs']:
    a, b = pair['origFile'], pair['wpFile']
    ae = metric(['-metric', 'AE', a, b])
    rmse = metric(['-metric', 'RMSE', a, b])
    strict = is_zero(ae)
    o, w = pair['orig'], pair['wp']
    rows.append({
        'route': pair['url'], 'page': pair['page'], 'viewport': pair['viewport'],
        'viewport_kind': pair['viewport_kind'], 'mandated_60': pair['mandated_60'],
        'AE': ae, 'RMSE': rmse, 'pixel_identical': strict,
        'http': {'original': o['status'], 'wordpress': w['status']},
        'images': {'original': o['imageCount'], 'wordpress': w['imageCount']},
        'broken_images': {'original': o['brokenImages'], 'wordpress': w['brokenImages']},
        'overflow_x': {'original': o['overflowX'], 'wordpress': w['overflowX']},
        'hidden_reveals': {'original': o['revealHidden'], 'wordpress': w['revealHidden']},
        'missing_alt': {'original': o['missingAlt'], 'wordpress': w['missingAlt']},
        'decorative_empty_alt': {'original': o.get('decorativeEmptyAlt', 0), 'wordpress': w.get('decorativeEmptyAlt', 0)},
        'rtl': {'original': o['dir'], 'wordpress': w['dir'], 'computed': w['computedDirection']},
        'font': {'family': w['fontFamily'], 'vazirmatn_loaded': w['vazirmatnLoaded']},
        'php_error_strings': {'original': o['phpErrorStrings'], 'wordpress': w['phpErrorStrings']},
        'title_equal': o['title'] == w['title'],
        'lang_equal': o['lang'] == w['lang'],
    })

def is_expected_404(entry):
    return ('/404/' in entry or ':404:' in entry) and ('404' in entry or 'Not Found' in entry)
console_all = report.get('consoleErrors', [])
http_all = report.get('httpErrors', [])
unexpected_console = [x for x in console_all if not is_expected_404(x)]
unexpected_http = [x for x in http_all if not is_expected_404(x)]
failed_requests = report.get('failedRequests', [])

checks = []
def check(name, ok, detail=''):
    checks.append({'name': name, 'result': 'PASS' if ok else 'FAIL', 'detail': str(detail)[:500]})

check('66 visual pairs captured', len(rows) == 66, len(rows))
check('all 66 pairs are strictly pixel-identical (AE=0)', all(r['pixel_identical'] for r in rows),
      sum(1 for r in rows if not r['pixel_identical']))
check('60 mandated pairs are pixel-identical', all(r['pixel_identical'] for r in rows if r['mandated_60']),
      sum(1 for r in rows if r['mandated_60']))
check('desktop and mobile viewports both covered',
      {r['viewport_kind'] for r in rows} == {'desktop', 'mobile'}, {r['viewport_kind'] for r in rows})
check('all 11 routes covered', len({r['route'] for r in rows}) == 11, len({r['route'] for r in rows}))
check('all public HTTP statuses match source (except intentional /404/ route)',
      all((r['http']['original'] == r['http']['wordpress']) or
          (r['route'] == '/404/' and r['http']['original'] == 200 and r['http']['wordpress'] == 404)
          for r in rows))
check('image counts match on every route/viewport', all(r['images']['original'] == r['images']['wordpress'] for r in rows))
check('no broken images', all(not r['broken_images']['original'] and not r['broken_images']['wordpress'] for r in rows))
check('no horizontal overflow', all(r['overflow_x']['original'] == 0 and r['overflow_x']['wordpress'] == 0 for r in rows))
check('no reveal elements left hidden', all(r['hidden_reveals']['original'] == 0 and r['hidden_reveals']['wordpress'] == 0 for r in rows))
check('no missing alt attributes; decorative alt counts match',
      all(r['missing_alt']['original'] == 0 and r['missing_alt']['wordpress'] == 0 and
          r['decorative_empty_alt']['original'] == r['decorative_empty_alt']['wordpress'] for r in rows))
check('RTL direction and Vazirmatn font preserved',
      all(r['rtl']['original'] == 'rtl' and r['rtl']['computed'] == 'rtl' and r['font']['vazirmatn_loaded'] for r in rows))
check('no PHP error strings in rendered HTML',
      all(not r['php_error_strings']['original'] and not r['php_error_strings']['wordpress'] for r in rows))
check('only intentional /404/ console/HTTP 404s (6 views), no unexpected JS/network errors',
      len(console_all) == 6 and not unexpected_console and len(http_all) == 6 and
      not unexpected_http and not failed_requests,
      {'console': len(console_all), 'unexpected_console': len(unexpected_console),
       'http': len(http_all), 'unexpected_http': len(unexpected_http), 'failedRequests': len(failed_requests)})

summary = {
    'checks': len(checks),
    'PASS': sum(1 for c in checks if c['result'] == 'PASS'),
    'FAIL': sum(1 for c in checks if c['result'] == 'FAIL'),
    'pairs': len(rows),
    'pixel_identical': sum(1 for r in rows if r['pixel_identical']),
    'expected_404_console_entries': len(console_all) - len(unexpected_console),
    'expected_404_http_entries': len(http_all) - len(unexpected_http),
    'failedRequests': len(failed_requests),
}
out = {
    'stage': 'v1.1.0-visual',
    'generatedAt': report.get('generatedAt'),
    'orig': report.get('orig'), 'wp': report.get('wp'),
    'summary': summary,
    'checks': checks,
    'pairs': rows,
    'consoleErrors': unexpected_console,
    'expected404ConsoleErrors': [x for x in console_all if is_expected_404(x)],
    'httpErrors': unexpected_http,
    'expected404HttpErrors': [x for x in http_all if is_expected_404(x)],
    'failedRequests': failed_requests,
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf8')
for c in checks:
    print(c['result'], c['name'], '::', c['detail'])
print('summary', summary, 'written to', OUT)
raise SystemExit(0 if summary['FAIL'] == 0 else 1)
