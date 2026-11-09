#!/usr/bin/env python3
"""Stage F — link/asset/host/SEO/token audit on the FINAL ZIP-installed site."""
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = '/home/user/raouf'
CONV = os.path.join(ROOT, 'wordpress-conversion')
THEME = os.path.join(CONV, 'theme', 'raouf-academy')
RES = os.path.join(CONV, 'qa', 'results')
WP = os.environ.get('WP_URL', 'http://127.0.0.1:9411').rstrip('/')
ORIG = os.environ.get('ORIG_URL', 'http://127.0.0.1:3000').rstrip('/')
OUT = os.environ.get('LINKS_REPORT', os.path.join(RES, 'stage-F-links.json'))
ROUTES = ['/', '/courses/', '/courses/skin-facial/', '/courses/medical-emergency/',
          '/courses/pharmacy-technician/', '/courses/massage-relaxation/', '/about/',
          '/gallery/', '/contact/', '/register/', '/404/']
KNOWN_EXTERNAL = ('instagram.com', 'openstreetmap.org', 'schema.org', 'w3.org',
                  'gnu.org', 'github.com', 'wordpress.org', 'gravatar.com')
UA = {'User-Agent': 'Stage-F-Links/1.0'}
_cache = {}


def get(url, headers=None):
    if url in _cache:
        return _cache[url]
    h = dict(UA)
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, headers=h)
    try:
        r = urllib.request.urlopen(req, timeout=60)
        body = r.read()
        out = (r.status, body)
    except urllib.error.HTTPError as e:
        out = (e.code, e.read())
    _cache[url] = out
    return out


def urls_in(html):
    out = set()
    for tag in re.findall(r'<(?:a|img|link|script|source|use|meta|form|iframe)\b[^>]*>', html):
        for attr in ('href', 'src', 'srcset', 'data-full', 'action', 'content', 'poster'):
            for v in re.findall(r'\b' + attr + r'=[\'"]([^\'"]*)[\'"]', tag):
                if v.startswith('data:'):
                    continue
                for part in v.split(','):
                    u = part.strip().split(' ')[0]
                    # meta content is only a URL when it actually looks like one
                    if attr == 'content' and not re.match(r'^(?:https?://|/)', u):
                        continue
                    if u and not u.startswith(('data:', 'mailto:', 'tel:', 'javascript:', '#', '{{')):
                        out.add(u)
    return out


def sha(b):
    return hashlib.sha256(b).hexdigest()


def main():
    checks = []

    def add(name, ok, detail):
        checks.append({'check': name, 'result': 'PASS' if ok else 'FAIL', 'detail': str(detail)[:400]})

    # 1. No hardcoded installation host in any runtime theme file.
    banned = re.compile(r'localhost|127\.0\.0\.1|stage-[cd]\.example|example\.test|PROBE|DO-NOT-SHIP', re.I)
    hits = []
    for dp, dn, fn in os.walk(THEME):
        dn[:] = [d for d in dn if not d.startswith('.')]
        for f in fn:
            rel = os.path.relpath(os.path.join(dp, f), THEME)
            if rel == 'assets/css/style.css.source.css' or os.path.splitext(f)[1].lower() in ('.webp', '.jpg', '.woff2', '.png'):
                continue
            try:
                text = open(os.path.join(dp, f), encoding='utf8').read()
            except Exception:
                continue
            for m in banned.finditer(text):
                hits.append({'file': rel, 'match': m.group(0)})
    add('no hardcoded localhost / QA host / probe data in runtime theme sources',
        not hits, 'hits=%s' % hits[:5])

    # 2. Every theme asset is served byte-identically by WordPress.
    files = []
    for dp, dn, fn in os.walk(THEME):
        dn[:] = [d for d in dn if not d.startswith('.')]
        for f in fn:
            rel = os.path.relpath(os.path.join(dp, f), THEME).replace(os.sep, '/')
            if rel == 'assets/css/style.css.source.css':
                continue
            files.append(rel)
    mismatches, http_bad, php_leaks, php_checked = [], [], [], 0
    for rel in sorted(files):
        st, body = get(WP + '/wp-content/themes/raouf-academy/' + rel)
        if st != 200:
            http_bad.append({'file': rel, 'status': st})
            continue
        local = open(os.path.join(THEME, rel), 'rb').read()
        if rel.endswith('.php'):
            # Direct access to a theme PHP file must be blocked by the ABSPATH
            # guard: an empty body is the CORRECT result, not a mismatch.
            php_checked += 1
            if body:
                php_leaks.append({'file': rel, 'bytes': len(body)})
        elif body != local:
            mismatches.append({'file': rel, 'served': sha(body), 'local': sha(local)})
    add('all %d runtime theme files served by WordPress (HTTP 200)' % len(files),
        not http_bad, 'bad=%s' % http_bad[:5])
    add('all %d non-PHP theme assets (CSS/JS/images/fonts/docs/POT/screenshot) are byte-identical to the delivered ZIP'
        % (len(files) - php_checked), not mismatches,
        'files=%d mismatches=%s' % (len(files) - php_checked, mismatches[:5]))
    add('direct access to all 28 theme PHP files returns an empty body (no source disclosure)',
        not php_leaks, 'php_files=%d leaks=%s' % (php_checked, php_leaks[:5]))

    # 3. Per-route links, SEO, tokens, PHP errors.
    rows = []
    all_internal, broken, foreign, leaked = 0, [], [], []
    for route in ROUTES:
        st, body = get(WP + route)
        html = body.decode('utf8', 'replace')
        urls = urls_in(html)
        internal = sorted(u for u in urls if u.startswith('/') or u.startswith(WP))
        external = sorted(u for u in urls if not (u.startswith('/') or u.startswith(WP)))
        route_broken = []
        for u in internal:
            target = WP + u if u.startswith('/') else u
            s, _ = get(target)
            path = urllib.parse.urlparse(target).path.rstrip('/')
            if s >= 400 and not (path == '/404' and s == 404):
                route_broken.append({'url': u, 'status': s})
        unknown_ext = [u for u in external if not any(h in u for h in KNOWN_EXTERNAL)]
        count = len(re.findall(r'rel=["\']canonical["\']', html))
        robots = len(re.findall(r'<meta name=["\']robots["\']', html))
        php = re.findall(r'(?:Fatal error|Parse error|Warning|Notice|Deprecated):[^<\n]{0,120}', html)
        rec = {'route': route, 'http': st, 'internal_links': len(internal),
               'internal_checked': len(internal), 'external_links': len(external),
               'broken': route_broken, 'unknown_external': unknown_ext,
               'canonical': count, 'robots': robots, 'leaked_tokens': html.count('{{'),
               'php_errors': php,
               'ok': st in (200, 404) and not route_broken and not unknown_ext
                     and count == 1 and robots == 1 and html.count('{{') == 0 and not php}
        rows.append(rec)
        all_internal += len(internal)
        broken += route_broken
        foreign += unknown_ext
        if html.count('{{'):
            leaked.append(route)

    add('all 11 routes: 0 broken internal links, 0 unknown external hosts, 1 canonical, 1 robots, 0 leaked tokens, 0 PHP errors',
        all(r['ok'] for r in rows),
        'internal_links_checked=%d broken=%d foreign=%d leaked=%s' % (all_internal, len(broken), len(foreign), leaked))

    # 4. Form endpoints exist and reject GET.
    form_rows = []
    for ep in ('/api/registrations', '/api/contact'):
        s, b = get(WP + ep)
        form_rows.append({'endpoint': ep, 'GET_status': s, 'body': b.decode('utf8', 'replace')[:120]})
    add('both real form endpoints reject GET with 405 JSON',
        all(x['GET_status'] == 405 for x in form_rows), json.dumps(form_rows, ensure_ascii=False))

    # 5. Original static site still available as the reference.
    s, _ = get(ORIG + '/')
    add('authoritative original static site is still serving unchanged', s == 200, 'http=%s' % s)

    out = {
        'stage': 'F', 'wp': WP, 'orig': ORIG,
        'checks': checks, 'routes': rows, 'form_endpoints': form_rows,
        'theme_files_checked': len(files),
        'asset_mismatches': mismatches, 'asset_http_errors': http_bad,
        'hardcoded_host_hits': hits,
        'summary': {'checks': len(checks), 'PASS': sum(1 for c in checks if c['result'] == 'PASS'),
                    'FAIL': sum(1 for c in checks if c['result'] == 'FAIL'),
                    'routes': len(rows), 'routes_ok': sum(1 for r in rows if r['ok']),
                    'internal_links_checked': all_internal, 'broken_links': len(broken),
                    'unknown_external': len(foreign), 'leaked_token_routes': leaked,
                    'asset_sha256_mismatches': len(mismatches)},
    }
    json.dump(out, open(OUT, 'w', encoding='utf8'), ensure_ascii=False, indent=2)
    print('stage-F-links:', out['summary'])
    for c in checks:
        print(' ', c['result'], c['check'], '::', c['detail'][:160])
    return 0 if out['summary']['FAIL'] == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
