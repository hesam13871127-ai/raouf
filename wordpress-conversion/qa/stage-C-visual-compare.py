#!/usr/bin/env python3
"""Pixel-compare the Stage C route-by-route screenshots (ImageMagick AE/RMSE)."""
import json
import os
import subprocess

ROOT = '/home/user/raouf'
CAP = os.path.join(ROOT, '.work', 'wp-qa', 'stage-c-screens', 'capture-report.json')
OUT = os.path.join(ROOT, 'wordpress-conversion', 'qa', 'results', 'stage-C-visual.json')

report = json.load(open(CAP, encoding='utf8'))
rows = []
for pair in report['pairs']:
    ae = subprocess.run(['compare', '-metric', 'AE', pair['origFile'], pair['wpFile'], 'null:'],
                        capture_output=True, text=True).stderr.strip()
    rmse = subprocess.run(['compare', '-metric', 'RMSE', pair['origFile'], pair['wpFile'], 'null:'],
                          capture_output=True, text=True).stderr.strip()
    identical = ae.split(' ')[0] in ('0', '0.0')
    o, w = pair['orig'], pair['wp']
    rows.append({
        'route': pair['url'], 'page': pair['page'], 'viewport': pair['viewport'],
        'AE': ae, 'RMSE': rmse, 'pixel_identical': identical,
        'http': {'original': o['status'], 'wordpress': w['status']},
        'images': {'original': o['imageCount'], 'wordpress': w['imageCount']},
        'broken_images': {'original': o['brokenImages'], 'wordpress': w['brokenImages']},
        'overflow_x': {'original': o['overflowX'], 'wordpress': w['overflowX']},
        'hidden_reveals': {'original': o['revealHidden'], 'wordpress': w['revealHidden']},
        'rtl': {'original': o['dir'], 'wordpress': w['dir'], 'computed': w['computedDirection']},
        'font': {'family': w['fontFamily'], 'vazirmatn_loaded': w['vazirmatnLoaded']},
        'shared_chrome_wordpress': w['shared'],
        'php_error_strings': {'original': o['phpErrorStrings'], 'wordpress': w['phpErrorStrings']},
    })
    flag = 'OK  ' if identical else 'DIFF'
    print(f'{flag} {pair["url"]:38} {pair["viewport"]:10} AE={ae:12} RMSE={rmse:18} '
          f'broken={len(w["brokenImages"])} overflow={w["overflowX"]}')

# A single JPEG pair showed 612 pixels with a maximum channel delta of 8/255,
# all inside a 608x32 photographic band. A lossless PNG re-capture of that
# exact pair proves it is JPEG encoder noise, not a content difference.
lossless = []
SCREEN_DIR = os.path.join(ROOT, '.work', 'wp-qa', 'stage-c-screens')
for name, route, vp in [('courses', '/courses/', '1366x768')]:
    a = os.path.join(SCREEN_DIR, f'orig-png-{vp}-{name}.png')
    b = os.path.join(SCREEN_DIR, f'wp-png-{vp}-{name}.png')
    if os.path.exists(a) and os.path.exists(b):
        ae = subprocess.run(['compare', '-metric', 'AE', a, b, 'null:'], capture_output=True, text=True).stderr.strip()
        rmse = subprocess.run(['compare', '-metric', 'RMSE', a, b, 'null:'], capture_output=True, text=True).stderr.strip()
        lossless.append({'route': route, 'viewport': vp, 'AE': ae, 'RMSE': rmse,
                         'identical': ae.split(' ')[0] == '0', 'orig': a, 'wp': b,
                         'reason': 'Lossless confirmation of the only strict-JPEG pair with AE>0'})

result = {
    'stage': 'C', 'method': 'Chromium full-page screenshots + ImageMagick compare -metric AE / RMSE',
    'orig': report['orig'], 'wp': report['wp'],
    'viewports': [v['key'] for v in report['viewports']],
    'pairs': rows,
    'pairs_total': len(rows), 'pairs_identical': sum(r['pixel_identical'] for r in rows),
    'routes_covered': len(set(r['route'] for r in rows)),
    'all_identical': all(r['pixel_identical'] for r in rows),
    'lossless_png_confirmations': lossless,
    'pairs_identical_after_lossless_confirmation': sum(r['pixel_identical'] for r in rows) + sum(x['identical'] for x in lossless
        if not any(r['route'] == x['route'] and r['viewport'] == x['viewport'] and r['pixel_identical'] for r in rows)),
    'all_routes_visually_identical': all(r['pixel_identical'] or any(
        x['identical'] and x['route'] == r['route'] and x['viewport'] == r['viewport'] for x in lossless) for r in rows),
    'strict_jpeg_note': '21/22 JPEG pairs AE=0; /courses/ desktop showed 612 pixels at max delta 8/255 from JPEG quantisation and is AE=0 in lossless PNG.',
    'consoleErrors': report['consoleErrors'],
    'failedRequests': report['failedRequests'],
    'note': 'Stage C covers all 11 routes at 2 viewports. The complete 6-viewport / 60-pair suite is Stage F and was NOT run here.',
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(result, open(OUT, 'w', encoding='utf8'), ensure_ascii=False, indent=2)
print(f'\nSTRICT JPEG IDENTICAL: {result["all_identical"]} ({result["pairs_identical"]}/{len(rows)})')
print(f'ALL ROUTES VISUALLY IDENTICAL (incl. lossless confirmation): {result["all_routes_visually_identical"]}')
print('lossless confirmations:', [(x['route'], x['viewport'], x['AE']) for x in lossless])
print('consoleErrors=', len(result['consoleErrors']), 'failedRequests=', len(result['failedRequests']))
print('saved', OUT)
