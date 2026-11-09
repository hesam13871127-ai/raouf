#!/usr/bin/env python3
"""Structural comparison: original static site vs WordPress theme output."""
import re, os, urllib.request, json, sys

ORIG = os.environ.get('ORIG_URL', 'http://127.0.0.1:3000')
WP   = os.environ.get('WP_URL', 'http://127.0.0.1:9400')
SRC  = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '.work', 'wp-source', 'raouf-academy', 'public'))

ROUTES = ['/', '/courses/', '/courses/skin-facial/', '/courses/medical-emergency/',
          '/courses/pharmacy-technician/', '/courses/massage-relaxation/', '/about/',
          '/gallery/', '/contact/', '/register/', '/404/']

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        return urllib.request.urlopen(req, timeout=60).read().decode('utf-8')
    except urllib.error.HTTPError as exc:
        return exc.read().decode('utf-8')

def norm(html, wp=False):
    if wp:
        html = html.replace(WP + '/wp-content/themes/raouf-academy', '')
        html = html.replace(WP, '')
        html = re.sub(r'\?ver=[\d.]+', '', html)
    else:
        html = html.replace(ORIG, '')
    html = html.replace('http://localhost:3000', '')
    html = html.replace('http://127.0.0.1:3000', '')
    return html

def main_of(html):
    i = html.find('<main id="main">')
    j = html.find('</main>', i)
    return html[i + len('<main id="main">'):j] if i >= 0 else ''

def signatures(html):
    return {
        'sections': len(re.findall(r'<section\b', html)),
        'class-attrs': len(re.findall(r'class="', html)),
        'ids': len(re.findall(r'\sid="', html)),
        'imgs': len(re.findall(r'<img\b', html)),
        'svgs': len(re.findall(r'<svg\b', html)),
        'details': len(re.findall(r'<details\b', html)),
        'buttons': len(re.findall(r'<button\b', html)),
        'links': len(re.findall(r'<a\b', html)),
        'forms': len(re.findall(r'<form\b', html)),
        'lightbox': 'class="lightbox"' in html,
        'h1': re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', (re.search(r'<h1[^>]*>(.*?)</h1>', html, re.S) or [None, ''])[1])).strip(),
    }

def class_sequence(html):
    return re.findall(r'<(\w+)[^>]*?class="([^"]*)"', html)

def main():
    out = []
    ok = True
    for route in ROUTES:
        wp = norm(get(WP + route), True)
        orig = get(ORIG + route)
        m_wp, m_orig = main_of(wp), norm(main_of(orig))
        # header/footer fragments (everything outside <main>)
        def outside(html):
            body = html[html.find('<body'):]
            i = body.find('<main id="main">')
            j = body.find('</main>', i)
            if i < 0:
                return body, ''
            return body[:i], body[j + len('</main>'):]
        h_orig, f_orig = outside(orig)
        h_wp, f_wp = outside(wp)
        s_wp, s_orig = signatures(m_wp), signatures(m_orig)
        same_main = (m_wp == m_orig)
        seq_same = class_sequence(m_wp) == class_sequence(m_orig)
        diffs = {k: (s_orig[k], s_wp[k]) for k in s_orig if s_orig[k] != s_wp[k]}
        rec = {
            'route': route,
            'http': 200,
            'main_identical': same_main,
            'class_sequence_identical': seq_same,
            'main_lengths': (len(m_orig), len(m_wp)),
            'signature_diffs': diffs,
            'original_signatures': s_orig,
            'wordpress_signatures': s_wp,
            'header_identical': h_orig == h_wp,
            'footer_identical': f_orig == f_wp,
            'header_lengths': (len(h_orig), len(h_wp)),
            'footer_lengths': (len(f_orig), len(f_wp)),
        }
        out.append(rec)
        flag = 'OK  ' if same_main and seq_same and not diffs else 'DIFF'
        if flag == 'DIFF':
            ok = False
        print(f'{flag} {route:38} main_equal={same_main} seq_equal={seq_same} lens={len(m_orig)}/{len(m_wp)} '
              f'header={rec["header_identical"]} footer={rec["footer_identical"]} diffs={diffs}')
        if not same_main and len(m_orig) and len(m_wp):
            # show the first divergence for debugging
            k = 0
            while k < min(len(m_orig), len(m_wp)) and m_orig[k] == m_wp[k]:
                k += 1
            print('     first divergence at', k, '\n     ORIG:', repr(m_orig[max(0,k-70):k+110]), '\n     WP  :', repr(m_wp[max(0,k-70):k+110]))
    report = os.environ.get('STRUCTURAL_REPORT', os.path.join(os.path.dirname(__file__), 'results', 'structural.json'))
    os.makedirs(os.path.dirname(report), exist_ok=True)
    with open(report, 'w', encoding='utf8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print('\nALL IDENTICAL' if ok else '\nDIFFERENCES FOUND')
    return 0 if ok else 1

if __name__ == '__main__':
    sys.exit(main())
