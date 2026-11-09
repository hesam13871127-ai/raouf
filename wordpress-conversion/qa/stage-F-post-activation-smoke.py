#!/usr/bin/env python3
"""Stage F — real post-activation smoke test on the EXACT installed theme ZIP.

Runs against the fresh WordPress site :9411 where the delivered ZIP was
uploaded and activated through the admin UI. Every check below is executed
here; nothing is copied from an earlier report. Browser JS console / PHP
runtime errors were measured separately in stage-F-console.json.
"""
import hashlib
import html
import http.cookiejar
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = '/home/user/raouf'
BASE = os.environ.get('WP_URL', 'http://127.0.0.1:9411').rstrip('/')
OUT = os.environ.get('SMOKE_REPORT', os.path.join(ROOT, 'wordpress-conversion', 'qa', 'results', 'stage-F-post-activation-smoke.json'))
THEME = os.path.join(ROOT, 'wordpress-conversion', 'theme', 'raouf-academy')
ROUTES = ['/', '/courses/', '/courses/skin-facial/', '/courses/medical-emergency/',
          '/courses/pharmacy-technician/', '/courses/massage-relaxation/', '/about/',
          '/gallery/', '/contact/', '/register/', '/404/']
UA = {'User-Agent': 'Stage-F-PostActivationSmoke/1.0'}
jar = http.cookiejar.CookieJar()
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
anon = urllib.request.build_opener()

def call(path, data=None, headers=None, method=None, opener=None):
    h = dict(UA)
    if headers:
        h.update(headers)
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=h)
    try:
        r = (opener or op).open(req, timeout=60)
        return r.status, r.read().decode('utf8', 'replace'), r.geturl()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf8', 'replace'), e.geturl()

def call_bytes(path):
    req = urllib.request.Request(BASE + path, headers=UA)
    try:
        r = anon.open(req, timeout=60)
        return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()

def token():
    call('/register/')
    return next((c.value for c in jar if c.name == 'raouf_csrf'), '')

def sha256_file(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()

def main():
    checks, route_rows, details = [], [], {}

    def add(name, ok, detail):
        checks.append({'check': name, 'result': 'PASS' if ok else 'FAIL', 'detail': str(detail)[:400]})

    php_error = re.compile(r'Fatal error|Parse error|Uncaught|Warning:|Notice:|Deprecated:', re.I)

    # 1. All 11 routes on the activated installation.
    for route in ROUTES:
        expected = 404 if route == '/404/' else 200
        st, body, url = call(route)
        errs = php_error.findall(body)
        row = {'route': route, 'http': st, 'expected': expected, 'bytes': len(body),
               'php_error_strings': errs[:3], 'has_html': '<html' in body.lower(), 'url': url}
        route_rows.append(row)
        add('route %s returns expected HTTP %d with HTML and no PHP error string' % (route, expected),
            st == expected and row['has_html'] and not errs,
            'status=%s bytes=%s php_errors=%s' % (st, len(body), errs[:2]))

    # 2. Delivered CSS/JS are byte-identical to the source theme on the activated site.
    for rel in ['style.css', 'assets/js/app.js']:
        st, raw = call_bytes('/wp-content/themes/raouf-academy/' + rel)
        served = hashlib.sha256(raw).hexdigest()
        local = sha256_file(os.path.join(THEME, rel))
        add('served %s is byte-identical to delivered theme file' % rel,
            st == 200 and served == local, 'status=%s served=%s local=%s' % (st, served[:16], local[:16]))
        details[rel] = {'served_sha256': served, 'local_sha256': local, 'http': st}

    # 3. GET on the form endpoint is rejected without consuming the rate limit.
    st, raw, _ = call('/api/registrations', method='GET')
    add('GET /api/registrations returns 405 JSON', st == 405 and 'method not allowed' in raw,
        'status=%s body=%s' % (st, raw[:120]))

    # 4. One REAL end-to-end form submission with a unique payload.
    persian = str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹')
    unique = str(int(time.time()) % 1000000000).zfill(9).translate(persian)
    phone = '۰۹' + unique
    ascii_phone = '09' + unique.translate(str.maketrans('۰۱۲۳۴۵۶۷۸۹', '0123456789'))
    payload = {'name': 'تست نهایی پس از فعالسازی', 'phone': phone, 'course': 'skin-facial',
               'message': 'پیام واقعی تست دود پس از نصب و فعالسازی قالب، ' + str(int(time.time())),
               'website': ''}
    csrf = token()
    body = json.dumps(payload, ensure_ascii=False).encode('utf8')
    st, raw, _ = call('/api/registrations', body,
                      {'Content-Type': 'application/json', 'Accept': 'application/json',
                       'X-CSRF-Token': csrf}, 'POST')
    try:
        response = json.loads(raw)
    except Exception:
        response = {}
    ref = response.get('id', '') if isinstance(response, dict) else ''
    details['submission'] = {'http': st, 'response': response, 'ref': ref,
                             'phone_persian': phone, 'phone_ascii': ascii_phone,
                             'csrf_cookie_present': bool(csrf)}
    add('fresh registration POST stores data and returns 201 with a real tracking reference',
        st == 201 and response.get('ok') is True and ref.startswith('REG-'),
        'status=%s body=%s' % (st, raw[:220]))
    add('CSRF cookie was obtained from the real /register/ page', bool(csrf), 'token_len=%d' % len(csrf))

    # 5. Real administrator login, list and per-record detail.
    call('/wp-login.php')
    st, login_body, url = call('/wp-login.php',
        urllib.parse.urlencode({'log': 'admin', 'pwd': 'password', 'wp-submit': 'Log In',
                                'redirect_to': BASE + '/wp-admin/', 'testcookie': '1'}).encode(),
        {'Content-Type': 'application/x-www-form-urlencoded'}, 'POST')
    add('administrator login succeeds through the real wp-login.php form',
        '/wp-admin' in url and 'wp-login.php' not in url, 'url=%s status=%s' % (url, st))

    list_path = '/wp-admin/themes.php?page=raouf-submissions'
    st, listing, _ = call(list_path)
    add('admin submissions list is reachable and contains the new reference',
        st == 200 and bool(ref) and ref in listing, 'status=%s ref_in_list=%s' % (st, ref in listing))

    detail_urls = [html.unescape(u) for u in re.findall(r'href="([^"]*raouf_view=\d+[^"]*)"', listing)]
    add('admin list provides real per-record nonce links', len(detail_urls) >= 1,
        'links=%d' % len(detail_urls))
    detail_ok, forged_ok, matched_detail_url = False, False, ''
    for u in detail_urls:
        path = u if u.startswith('http') else (u if u.startswith('/') else '/wp-admin/' + u)
        if path.startswith('http'):
            q = urllib.parse.urlparse(path)
            path = q.path + ('?' + q.query if q.query else '')
        ds, detail, _ = call(path)
        if ref and ref in detail:
            detail_ok = ds == 200 and 'جزئیات درخواست' in detail and ascii_phone in detail
            forged = re.sub(r'(_wpnonce=)[^&"]+', r'\1deadbeef', path)
            fs, fbody, _ = call(forged)
            forged_ok = ascii_phone not in fbody and ref not in fbody
            matched_detail_url = path
            details['admin_detail'] = {'http': ds, 'url': path, 'forged_nonce_http': fs,
                                       'stored_phone_visible': ascii_phone in detail,
                                       'forged_nonce_leaks_ref': ref in fbody if ref else False}
            break
    add('admin detail view shows the stored phone/reference for an administrator',
        detail_ok, 'ok=%s url=%s' % (detail_ok, matched_detail_url[:160]))
    add('forged per-record nonce discloses no stored PII', forged_ok, 'ok=%s' % forged_ok)

    st, anon_listing, _ = call(list_path, opener=anon)
    add('anonymous visitor cannot read the submissions admin screen',
        (not ref or ref not in anon_listing) and ascii_phone not in anon_listing,
        'status=%s ref_in_anon_body=%s' % (st, ref in anon_listing if ref else False))

    # 6. No submitted PII leaks on any public route.
    leaked = []
    for route in ROUTES:
        s, b, _ = call(route, opener=anon)
        if (ref and ref in b) or ascii_phone in b or phone in b:
            leaked.append(route)
    add('no submitted phone or tracking reference appears on any of the 11 public routes',
        not leaked, 'leaked_routes=%s' % leaked)

    # 7. Direct include access and REST type exposure.
    s, b, _ = call('/wp-content/themes/raouf-academy/inc/forms.php', opener=anon)
    add('direct access to inc/forms.php leaks no PHP source',
        '<?php' not in b and 'raouf_validate_submission' not in b, 'status=%s len=%d' % (s, len(b)))
    s, b, _ = call('/wp-json/wp/v2/types', opener=anon)
    add('private submission CPT is not exposed through REST types',
        'raouf_submission' not in b, 'status=%s' % s)

    summary = {
        'checks': len(checks), 'PASS': sum(1 for c in checks if c['result'] == 'PASS'),
        'FAIL': sum(1 for c in checks if c['result'] == 'FAIL'),
        'routes_checked': len(route_rows), 'routes_ok': sum(1 for r in route_rows if r['http'] == r['expected']),
        'registration_reference': ref, 'admin_detail_url': matched_detail_url,
    }
    out = {
        'stage': 'F', 'test': 'post-activation smoke on the exact installed ZIP',
        'wp': BASE, 'generatedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'zip_sha256': json.load(open(os.path.join(ROOT, 'wordpress-conversion', 'qa', 'results', 'stage-F-install.json'), encoding='utf8'))['zip_sha256'],
        'summary': summary, 'checks': checks, 'routes': route_rows, 'details': details,
        'not_tested_here': [
            'SMTP / wp_mail() end-to-end delivery (no mail server)',
            'Browser JavaScript console during this smoke run (covered by stage-F-console.json)',
            'Real MySQL/MariaDB or LAMP/LEMP (Playground PHP-WASM + SQLite)',
            'Other WordPress/PHP versions, multisite, physical devices, third-party plugins',
            'A second admin ZIP upload (the already-tested ZIP was intentionally left unchanged)',
        ],
        'note': 'All checks above were executed live against :9411 in this run. No result was copied or inferred.',
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(json.dumps(summary, ensure_ascii=False))
    for c in checks:
        if c['result'] == 'FAIL':
            print('FAIL:', c['check'], c['detail'])
    return 0 if summary['FAIL'] == 0 else 1

if __name__ == '__main__':
    raise SystemExit(main())
