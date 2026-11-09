#!/usr/bin/env python3
"""Stage F pixel comparison: ImageMagick AE/RMSE over all 66 JPEG pairs,
plus automatic lossless-PNG confirmation for any pair with strict AE>0."""
import json
import os
import subprocess

ROOT = '/home/user/raouf'
SCREEN = os.path.join(ROOT, '.work', 'wp-qa', 'stage-f-screens')
OUT = os.path.join(ROOT, 'wordpress-conversion', 'qa', 'results', 'stage-F-visual.json')


def metric(args):
    r = subprocess.run(['compare'] + args + ['null:'], capture_output=True, text=True)
    return r.stderr.strip() or r.stdout.strip()


def is_zero(v):
    return v.split(' ')[0].split('(')[0] in ('0', '0.0', '0.0000')


report = json.load(open(os.path.join(SCREEN, 'capture-report.json'), encoding='utf8'))
rows = []
for pair in report['pairs']:
    a, b = pair['origFile'], pair['wpFile']
    ae = metric(['-metric', 'AE', a, b])
    rmse = metric(['-metric', 'RMSE', a, b])
    strict = is_zero(ae)
    fuzz = ae
    if not strict:
        fuzz = metric(['-fuzz', '1%', '-metric', 'AE', a, b])
    o, w = pair['orig'], pair['wp']
    rows.append({
        'route': pair['url'], 'page': pair['page'], 'viewport': pair['viewport'],
        'viewport_kind': pair['viewport_kind'], 'mandated_60': pair['mandated_60'],
        'AE': ae, 'RMSE': rmse, 'fuzz_1pct_AE': fuzz, 'pixel_identical': strict,
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
    })
    print(('OK  ' if strict else 'DIFF'), pair['url'], pair['viewport'], 'AE=', ae, 'fuzz=', fuzz)

diffs = [r for r in rows if not r['pixel_identical']]
lossless = []
if diffs:
    slim = [{'viewport': r['viewport'], 'page': r['page'], 'url': r['route'],
             'AE': r['AE'], 'fuzz_AE': r['fuzz_1pct_AE']} for r in diffs]
    json.dump(slim, open(os.path.join(SCREEN, 'visual-diff.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=2)
    print('Launching lossless PNG confirmation for', len(diffs), 'pairs')
    subprocess.run(['node', os.path.join(ROOT, 'wordpress-conversion', 'qa', 'stage-F-lossless.mjs')], check=True)
    index = json.load(open(os.path.join(SCREEN, 'lossless-index.json'), encoding='utf8'))
    for c in index:
        ae_png = metric(['-metric', 'AE', c['orig'], c['wp']])
        rmse_png = metric(['-metric', 'RMSE', c['orig'], c['wp']])
        ok = is_zero(ae_png)
        lossless.append({'route': c['url'], 'page': c['page'], 'viewport': c['viewport'],
                         'AE': ae_png, 'RMSE': rmse_png, 'identical': ok,
                         'orig': c['orig'], 'wp': c['wp'],
                         'reason': 'Lossless confirmation of a JPEG pair with AE>0'})
        for r in rows:
            if r['route'] == c['url'] and r['viewport'] == c['viewport']:
                r['lossless_confirmed_identical'] = ok
                r['visually_identical'] = ok
        print('  lossless', c['url'], c['viewport'], 'AE=', ae_png, 'identical=', ok)
for r in rows:
    r.setdefault('visually_identical', r['pixel_identical'])
    r.setdefault('lossless_confirmed_identical', None)

mandated = [r for r in rows if r['mandated_60']]
extra = [r for r in rows if not r['mandated_60']]
result = {
    'stage': 'F',
    'method': 'Chromium full-page screenshots + ImageMagick compare -metric AE / RMSE; lossless PNG re-capture for any AE>0 pair',
    'orig': report['orig'], 'wp': report['wp'],
    'viewports': [v['key'] for v in report['viewports']],
    'routes': [p['url'] for p in report['pages']],
    'pairs': rows,
    'pairs_total': len(rows),
    'pairs_strict_identical': sum(r['pixel_identical'] for r in rows),
    'pairs_visually_identical': sum(r['visually_identical'] for r in rows),
    'mandated_60_pairs': len(mandated),
    'mandated_60_visually_identical': sum(r['visually_identical'] for r in mandated),
    'extra_404_pairs': len(extra),
    'extra_404_visually_identical': sum(r['visually_identical'] for r in extra),
    'all_pairs_visually_identical': all(r['visually_identical'] for r in rows),
    'routes_covered': len(set(r['route'] for r in rows)),
    'broken_images_total': sum(len(r['broken_images']['wordpress']) for r in rows),
    'missing_alt_total': sum(r['missing_alt']['wordpress'] for r in rows),
    'php_error_strings_total': sum(len(r['php_error_strings']['wordpress']) for r in rows),
    'overflow_x_nonzero': sum(1 for r in rows if r['overflow_x']['wordpress'] > 1),
    'lossless_png_confirmations': lossless,
    'consoleErrors': report['consoleErrors'],
    'failedRequests': report['failedRequests'],
    'httpErrors': report['httpErrors'],
    'note': 'The 60 mandated pairs are 10 content routes x 6 viewports; 6 additional pairs cover /404/. Sticky overlays are hidden only for pixel equality and are verified separately by the interaction suite.',
}
json.dump(result, open(OUT, 'w', encoding='utf8'), ensure_ascii=False, indent=2)
print('\nSTRICT JPEG AE=0:', result['pairs_strict_identical'], '/', len(rows))
print('VISUALLY IDENTICAL:', result['pairs_visually_identical'], '/', len(rows))
print('MANDATED 60:', result['mandated_60_visually_identical'], '/', result['mandated_60_pairs'])
print('consoleErrors=', len(result['consoleErrors']), 'failedRequests=', len(result['failedRequests']))
print('saved', OUT)
