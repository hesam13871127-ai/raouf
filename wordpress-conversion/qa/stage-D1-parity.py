#!/usr/bin/env python3
"""Stage D-1 — prove the six applied SD fixes caused no output/asset change.

Comparisons (all read-only with respect to the theme source):
  A. Stage C structural report  == Stage D1 structural report (11 records)
  B. Stage C whole-DOM report   == Stage D1 whole-DOM report (11 rows)
  C. Full HTML, <head>, header, <main>, footer and every <form> of the
     pre-D theme (:9409) vs the fixed theme (:9410), both fresh Playground
     installs driven by the identical state blueprint -> byte-identical
     after normalising only the two installation origins and ?ver=.
  D. Every non-PHP theme asset byte-identical to the immutable Stage B/C
     theme ZIP baseline; reference CSS byte-identical to the original CSS.
  E. Only the 11 documented SD-fix PHP files differ from the baseline.
"""
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.request

ROOT = '/home/user/raouf'
CONV = os.path.join(ROOT, 'wordpress-conversion')
RES = os.path.join(CONV, 'qa', 'results')
THEME = os.path.join(CONV, 'theme', 'raouf-academy')
BASELINE = os.path.join(ROOT, '.work', 'wp-qa', 'stage-d-before', 'raouf-academy')
ORIGINAL_CSS = os.path.join(ROOT, '.work', 'wp-source', 'raouf-academy', 'public', 'assets', 'css', 'style.css')
PRE = os.environ.get('PRE_URL', 'http://127.0.0.1:9409')
POST = os.environ.get('POST_URL', 'http://127.0.0.1:9410')
CANON_WP = os.environ.get('WP_URL', 'http://127.0.0.1:9400')
OUT = os.environ.get('PARITY_REPORT', os.path.join(RES, 'stage-D1-parity.json'))

ROUTES = ['/', '/courses/', '/courses/skin-facial/', '/courses/medical-emergency/',
          '/courses/pharmacy-technician/', '/courses/massage-relaxation/',
          '/about/', '/gallery/', '/contact/', '/register/', '/404/']

EXPECTED_PHP = {
    'footer.php', 'functions.php', 'header.php',
    'inc/404-markup.php', 'inc/forms.php', 'inc/icons.php',
    'inc/lightbox-markup.php', 'inc/menus.php', 'inc/nav-fallback.php',
    'inc/options.php', 'inc/setup.php',
}


def sha(data):
    return hashlib.sha256(data if isinstance(data, bytes) else data.encode('utf8')).hexdigest()


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        return urllib.request.urlopen(req, timeout=60).read().decode('utf8', 'replace')
    except urllib.error.HTTPError as e:
        return e.read().decode('utf8', 'replace')


def normalise(html, origin):
    """Neutralise only installation-specific URLs, never content."""
    html = html.replace(origin + '/wp-content/themes/raouf-academy', '<THEME>')
    html = html.replace(origin, '<ORIGIN>')
    html = re.sub(r'\?ver=[\d.]+', '', html)
    return html


def compact(s):
    s = re.sub(r'<body[^>]*>', '<body>', s)
    s = re.sub(r'<script\b[^>]*>.*?</script>', '', s, flags=re.S)
    s = re.sub(r'<link\b[^>]*>', '', s)
    s = re.sub(r'<style\b[^>]*>.*?</style>', '', s, flags=re.S)
    s = re.sub(r'>\s+<', '><', s)
    return re.sub(r'\s+', ' ', s).strip()


def regions(html):
    head = re.search(r'<head[^>]*>(.*?)</head>', html, re.S)
    body = html[html.find('<body'):]
    i = body.find('<main id="main">')
    j = body.find('</main>', i) if i >= 0 else -1
    if i < 0:
        header, main, footer = body, '', ''
    else:
        header = body[:i]
        main = body[i + len('<main id="main">'):j]
        footer = body[j + len('</main>'):]
    forms = re.findall(r'<form\b[^>]*>.*?</form>', main, re.S)
    return {
        'head': compact(head.group(1) if head else ''),
        'header': compact(header),
        'main': compact(main),
        'footer': compact(footer),
        'forms': [compact(f) for f in forms],
    }


def file_hashes(root):
    out = {}
    for dp, dn, fn in os.walk(root):
        dn[:] = [x for x in dn if not x.startswith('.')]
        for f in fn:
            p = os.path.join(dp, f)
            out[os.path.relpath(p, root).replace(os.sep, '/')] = sha(open(p, 'rb').read())
    return out


def main():
    checks = []

    def add(name, ok, detail):
        checks.append({'check': name, 'result': 'PASS' if ok else 'FAIL', 'detail': detail})

    # A / B — exact equality with immutable Stage C evidence
    c_struct = json.load(open(os.path.join(RES, 'stage-C-structural.json'), encoding='utf8'))
    d_struct = json.load(open(os.path.join(RES, 'stage-D1-structural.json'), encoding='utf8'))
    eq_struct = c_struct == d_struct
    add('Stage C structural report reproduced byte-for-byte (11 routes)', eq_struct,
        'records=%d equal=%s main_identical=%d/%d class_sequence_identical=%d/%d'
        % (len(d_struct), eq_struct,
           sum(1 for x in d_struct if x['main_identical']), len(d_struct),
           sum(1 for x in d_struct if x['class_sequence_identical']), len(d_struct)))

    c_dom = json.load(open(os.path.join(RES, 'stage-C-dom.json'), encoding='utf8'))
    d_dom = json.load(open(os.path.join(RES, 'stage-D1-dom.json'), encoding='utf8'))
    eq_dom = c_dom['rows'] == d_dom['rows'] and d_dom['allIdentical'] and c_dom['allIdentical']
    add('Stage C whole-DOM (header/main/footer) reproduced byte-for-byte (11 routes)', eq_dom,
        'rows=%d allIdentical=%s header/main/footer=%d/%d'
        % (len(d_dom['rows']), d_dom['allIdentical'],
           sum(1 for x in d_dom['rows'] if x['identical']), len(d_dom['rows'])))

    # C — direct pre-D vs post-D HTML on two identical fresh installs
    per_route = []
    all_same = True
    for r in ROUTES:
        before = normalise(get(PRE + r), PRE)
        after = normalise(get(POST + r), POST)
        rb, ra = regions(before), regions(after)
        full_equal = before == after
        region_equal = all(rb[k] == ra[k] for k in ('head', 'header', 'main', 'footer', 'forms'))
        ok = full_equal and region_equal
        all_same &= ok
        per_route.append({
            'route': r,
            'full_html_identical': full_equal,
            'regions_identical': region_equal,
            'head_sha256': [sha(rb['head']), sha(ra['head'])],
            'header_sha256': [sha(rb['header']), sha(ra['header'])],
            'main_sha256': [sha(rb['main']), sha(ra['main'])],
            'footer_sha256': [sha(rb['footer']), sha(ra['footer'])],
            'form_count': [len(rb['forms']), len(ra['forms'])],
            'form_sha256': [sha(''.join(rb['forms'])), sha(''.join(ra['forms']))],
            'html_lengths': [len(before), len(after)],
        })
    add('Pre-D vs post-D full HTML + head/header/main/footer/forms identical (11 routes)', all_same,
        'routes_identical=%d/%d; differing=%s'
        % (sum(1 for x in per_route if x['full_html_identical'] and x['regions_identical']),
           len(per_route),
           [x['route'] for x in per_route if not (x['full_html_identical'] and x['regions_identical'])]))

    # D — no CSS/JS/image/font/content asset change
    b_assets = file_hashes(BASELINE)
    a_assets = file_hashes(THEME)
    non_php_diffs = sorted(
        k for k in set(b_assets) | set(a_assets)
        if not k.endswith('.php') and k != 'assets/css/style.css.source.css'
        and b_assets.get(k) != a_assets.get(k)
    )
    add('All non-PHP assets (style.css, app.js, 67 images, 3 fonts, readme, POT, screenshot) unchanged',
        not non_php_diffs,
        'baseline_files=%d current_files=%d differences=%s'
        % (len(b_assets), len(a_assets), non_php_diffs[:8]))
    ref = os.path.join(THEME, 'assets', 'css', 'style.css.source.css')
    ref_same = os.path.exists(ref) and sha(open(ref, 'rb').read()) == sha(open(ORIGINAL_CSS, 'rb').read())
    add('Reference CSS still byte-identical to the original source CSS', ref_same,
        'reference_css_sha256=%s' % (sha(open(ref, 'rb').read()) if os.path.exists(ref) else 'missing'))

    # E — only the 11 documented SD-fix PHP files differ
    php_diffs = sorted(k for k in set(b_assets) | set(a_assets)
                       if k.endswith('.php') and b_assets.get(k) != a_assets.get(k))
    add('Exactly the 11 documented SD-fix PHP files changed (no other PHP touched)',
        set(php_diffs) == EXPECTED_PHP,
        'changed=%d expected=%d files=%s' % (len(php_diffs), len(EXPECTED_PHP), php_diffs))

    # Canonical Stage C WP instance is still serving the same output
    canon_ok = True
    canon_detail = []
    for r in ROUTES:
        body = get(CANON_WP + r)
        if 'Fatal error' in body or 'Parse error' in body or 'Warning:' in body:
            canon_ok = False
            canon_detail.append(r)
    add('Canonical Stage C WP instance (:9400) still renders all 11 routes without PHP errors',
        canon_ok, 'routes_with_php_errors=%s' % canon_detail)

    out = {
        'stage': 'D-1',
        'generated_utc': __import__('time').strftime('%Y-%m-%dT%H:%M:%SZ', __import__('time').gmtime()),
        'comparisons': {
            'stage_C_structural': 'qa/results/stage-C-structural.json',
            'stage_D1_structural': 'qa/results/stage-D1-structural.json',
            'stage_C_dom': 'qa/results/stage-C-dom.json',
            'stage_D1_dom': 'qa/results/stage-D1-dom.json',
            'pre_D_theme': PRE + ' (extracted from immutable Stage B/C theme ZIP)',
            'post_D_theme': POST + ' (current theme with SD-01..SD-06)',
            'canonical_wp': CANON_WP,
            'original_static': 'http://127.0.0.1:3000',
        },
        'checks': checks,
        'per_route': per_route,
        'summary': {
            'total': len(checks),
            'PASS': sum(1 for c in checks if c['result'] == 'PASS'),
            'FAIL': sum(1 for c in checks if c['result'] == 'FAIL'),
            'routes_checked': len(per_route),
        },
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(out, open(OUT, 'w', encoding='utf8'), ensure_ascii=False, indent=2)
    print('D-1 parity: %d/%d PASS -> %s' % (out['summary']['PASS'], out['summary']['total'], OUT))
    for c in checks:
        print('  %s %s :: %s' % (c['result'], c['check'], c['detail'][:180]))
    return 0 if out['summary']['FAIL'] == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
