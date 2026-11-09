#!/usr/bin/env python3
"""Stage C — verify all internal links under a DIFFERENT installation domain.

Runs against a second WordPress Playground instance whose site URL is a
production-like hostname (Stage B's domain-independent token system must make
every link follow the current installation URL without any database edit).
"""
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = os.environ.get('ALT_BASE', 'http://127.0.0.1:9403')
HOST = os.environ.get('ALT_HOST', 'stage-c.example')
ORIGIN = os.environ.get('ALT_ORIGIN', 'http://stage-c.example')
OUT = '/home/user/raouf/wordpress-conversion/qa/results/stage-C-domain.json'
ROUTES = ['/', '/courses/', '/courses/skin-facial/', '/courses/medical-emergency/',
          '/courses/pharmacy-technician/', '/courses/massage-relaxation/', '/about/',
          '/gallery/', '/contact/', '/register/', '/404/']


def get(url, method='GET'):
    """Fetch url, always presenting the alternate WordPress host."""
    p = urllib.parse.urlparse(url)
    p = p._replace(netloc='127.0.0.1:9403')
    req = urllib.request.Request(p.geturl(), method=method, headers={'Host': HOST, 'User-Agent': 'Stage-C-Domain/1.0'})
    try:
        r = urllib.request.urlopen(req, timeout=60)
        return r.status, r.read().decode('utf8', 'replace')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf8', 'replace')


def absolute(u):
    if u.startswith(ORIGIN):
        return u
    if u.startswith('/'):
        return ORIGIN + u
    return None


def main():
    rows = []
    for route in ROUTES:
        st, html = get(ORIGIN + route)
        urls = set()
        for tag in re.findall(r'<(?:a|img|link|script|source|use)\b[^>]*>', html):
            for attr in ('href', 'src', 'srcset', 'data-full'):
                for v in re.findall(r'\b' + attr + r"=['\"]([^\"']*)['\"]", tag):
                    for part in v.split(','):
                        u = part.strip().split(' ')[0]
                        if u and not u.startswith(('data:', 'mailto:', 'tel:', 'javascript:', '#')):
                            urls.add(u)
        internal = sorted(u for u in urls if u.startswith(ORIGIN) or u.startswith('/'))
        external = sorted(u for u in urls if not (u.startswith(ORIGIN) or u.startswith('/')))
        broken = []
        checked = 0
        for u in internal:
            target = absolute(u)
            if not target:
                continue
            checked += 1
            s, _ = get(target, 'HEAD' if False else 'GET')
            path = urllib.parse.urlparse(target).path.rstrip('/')
            if s >= 400 and not (path == '/404' and s == 404):
                broken.append({'url': u, 'status': s})
        foreign = [u for u in urls if '127.0.0.1:9400' in u or '127.0.0.1:3000' in u
                   or 'localhost' in u or '{{' in u]
        can = len(re.findall(r'rel=["\']canonical["\']', html))
        rob = len(re.findall(r'<meta name=["\']robots["\']', html))
        rec = {
            'route': route, 'http': st, 'internal_links': len(internal), 'checked': checked,
            'external_links': len(external), 'broken': broken, 'foreign_install_urls': foreign,
            'canonical': can, 'robots': rob, 'leaked_tokens': html.count('{{'),
            'all_internal_use_alternate_origin': all(u.startswith(ORIGIN) for u in internal if not u.startswith('/')),
            'root_relative_canonical_ok': can == 1,
        }
        rows.append(rec)
        ok = st in (200, 404) and not broken and not foreign and can == 1 and rob == 1 and rec['leaked_tokens'] == 0
        print(f'{"OK  " if ok else "FAIL"} {route:38} http={st} links={len(internal)}/{checked} broken={len(broken)} '
              f'foreign={len(foreign)} canonical={can} robots={rob} tokens={rec["leaked_tokens"]}')

    # Token storage on the alternate domain.
    st, rest = get(ORIGIN + '/wp-json/wp/v2/pages?per_page=100&_fields=slug,content')
    pages = json.loads(rest) if st == 200 else []
    storage = {
        'http': st, 'pages': len(pages),
        'all_tokenised': all(p['content']['rendered'].count('{{') > 0 for p in pages) if pages else False,
        'hardcoded_hosts': sum(len(re.findall(r'https?://', p['content']['rendered'])) for p in pages),
        'asset_tokens': sum(p['content']['rendered'].count('{{ASSET:') for p in pages),
        'link_tokens': sum(p['content']['rendered'].count('{{LINK:') for p in pages),
    }
    result = {
        'stage': 'C', 'alternate_origin': ORIGIN, 'alternate_host': HOST, 'base': BASE,
        'routes': rows, 'token_storage': storage,
        'summary': {
            'routes_checked': len(rows), 'routes_ok': sum(
                r['http'] in (200, 404) and not r['broken'] and not r['foreign_install_urls']
                and r['canonical'] == 1 and r['robots'] == 1 and r['leaked_tokens'] == 0 for r in rows),
            'internal_links_checked': sum(r['checked'] for r in rows),
            'broken_links': sum(len(r['broken']) for r in rows),
            'foreign_install_urls': sum(len(r['foreign_install_urls']) for r in rows),
            'token_storage_hardcoded_hosts': storage['hardcoded_hosts'],
        },
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(result, open(OUT, 'w', encoding='utf8'), ensure_ascii=False, indent=2)
    print('\nSUMMARY', json.dumps(result['summary'], ensure_ascii=False))
    print('saved', OUT)
    return 0 if result['summary']['routes_ok'] == 11 else 1


if __name__ == '__main__':
    sys.exit(main())
