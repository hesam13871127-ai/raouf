#!/usr/bin/env python3
"""Whole-DOM (header/main/footer) comparison, ignoring only WordPress-added
body classes, script/style tags and installation-specific URL origins."""
import os, re, sys, json, urllib.request, difflib

ORIG = os.environ.get('ORIG_URL', 'http://127.0.0.1:3000')
WP = os.environ.get('WP_URL', 'http://127.0.0.1:9400')
OUT = os.environ.get('DOM_REPORT', '/home/user/raouf/.work/wp-qa/forms/dom-compare.json')
ROUTES = ['/', '/courses/', '/courses/skin-facial/', '/courses/medical-emergency/',
          '/courses/pharmacy-technician/', '/courses/massage-relaxation/', '/about/',
          '/gallery/', '/contact/', '/register/', '/404/']

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        return urllib.request.urlopen(req, timeout=60).read().decode('utf8')
    except urllib.error.HTTPError as e:
        return e.read().decode('utf8')

def norm(html, wp=False):
    if wp:
        html = html.replace(WP + '/wp-content/themes/raouf-academy', '')
        html = html.replace(WP, '')
        html = re.sub(r'\?ver=[\d.]+', '', html)
    else:
        html = html.replace(ORIG, '').replace('http://localhost:3000', '')
    return html.replace('http://127.0.0.1:3000', '')

def compact(s):
    s = re.sub(r'<body[^>]*>', '<body>', s)
    s = re.sub(r'<script\b[^>]*>.*?</script>', '', s, flags=re.S)
    s = re.sub(r'<link\b[^>]*>', '', s)
    s = re.sub(r'<style\b[^>]*>.*?</style>', '', s, flags=re.S)
    s = re.sub(r'>\s+<', '><', s)
    return re.sub(r'\s+', ' ', s).strip()

def parts(html):
    body = html[html.find('<body'):]
    i = body.find('<main id="main">')
    j = body.find('</main>', i)
    if i < 0:
        return compact(body), '', ''
    return compact(body[:i]), compact(body[i + len('<main id="main">'):j]), compact(body[j + 7:])

rows = []
for r in ROUTES:
    o, w = parts(norm(get(ORIG + r))), parts(norm(get(WP + r), True))
    eq = [a == b for a, b in zip(o, w)]
    rows.append({'route': r, 'header': eq[0], 'main': eq[1], 'footer': eq[2],
                 'identical': all(eq),
                 'lengths': [[len(a), len(b)] for a, b in zip(o, w)]})
    print(f'{"OK  " if all(eq) else "DIFF"} {r:38} header={eq[0]} main={eq[1]} footer={eq[2]}')
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump({'orig': ORIG, 'wp': WP, 'rows': rows, 'allIdentical': all(x['identical'] for x in rows)},
          open(OUT, 'w', encoding='utf8'), ensure_ascii=False, indent=2)
print('ALL DOM IDENTICAL' if all(x['identical'] for x in rows) else 'DIFFERENCES')
sys.exit(0 if all(x['identical'] for x in rows) else 1)
