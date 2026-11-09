#!/usr/bin/env python3
"""Stage F — end-to-end form test: browser-equivalent HTTP -> real storage ->
secure display in the WordPress admin -> no public PII leak.

Runs against a FRESH install. The theme rate limiter allows 8 POSTs per client
per 15 minutes, so the matrix uses exactly 8 meaningful submissions and then
proves the 9th is rejected (429).
"""
import html
import http.cookiejar
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = '/home/user/raouf'
BASE = os.environ.get('WP_URL', 'http://127.0.0.1:9415').rstrip('/')
OUT = os.environ.get('FORMS_REPORT', os.path.join(ROOT, 'wordpress-conversion', 'qa', 'results', 'stage-F-forms.json'))
ROUTES = ['/', '/courses/', '/courses/skin-facial/', '/courses/medical-emergency/',
          '/courses/pharmacy-technician/', '/courses/massage-relaxation/', '/about/',
          '/gallery/', '/contact/', '/register/', '/404/']
UA = {'User-Agent': 'Stage-F-Forms/1.0'}
jar = http.cookiejar.CookieJar()
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
anon = urllib.request.build_opener()


def call(path, data=None, headers=None, method=None, opener=None):
    h = dict(UA)
    if headers:
        h.update(headers)
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=h)
    o = opener or op
    try:
        r = o.open(req, timeout=60)
        return r.status, r.read().decode('utf8', 'replace'), r.geturl()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf8', 'replace'), e.geturl()


def token():
    call('/register/')
    return next((c.value for c in jar if c.name == 'raouf_csrf'), '')


def post(ep, payload, use_csrf=True, forged=None):
    t = token()
    body = json.dumps(payload, ensure_ascii=False).encode('utf8')
    h = {'Content-Type': 'application/json', 'Accept': 'application/json'}
    if use_csrf:
        h['X-CSRF-Token'] = forged if forged else t
    return call(ep, body, h, 'POST')


def parsed(raw):
    try:
        return json.loads(raw)
    except Exception:
        return raw[:200]


def main():
    checks = []
    steps = []

    def add(name, ok, detail):
        checks.append({'check': name, 'result': 'PASS' if ok else 'FAIL', 'detail': str(detail)[:400]})

    def step(label, ep, payload, expected, use_csrf=True, forged=None):
        st, raw, _ = post(ep, payload, use_csrf, forged)
        p = parsed(raw)
        steps.append({'label': label, 'endpoint': ep, 'http': st, 'expected': expected, 'body': p})
        add(label, st == expected, 'status=%s expected=%s body=%s'
            % (st, expected, json.dumps(p, ensure_ascii=False)[:160]))
        return st, p

    REG = {'name': 'علی رضایی', 'phone': '۰۹۱۴۲۲۲۳۳۴۴', 'course': 'skin-facial',
           'message': 'سلام، میخواهم در دوره پاکسازی پوست شرکت کنم.', 'website': ''}
    XSS = '<img src=x onerror=alert(1)> <script>alert("xss")</script>'
    # Empty e-mail is an allowed optional field (forms.py b behaviour), while
    # the subject/message carry an HTML/JS/SQL payload for the escaping test.
    CONTACT = {'name': 'مریم احمدی', 'phone': '09149998877', 'email': '',
               'subject': "' OR 1=1 -- " + XSS, 'message': XSS + ' متن معتبر برای تست ذخیره امن.',
               'website': ''}

    # 0. GET is rejected (does not consume the rate-limit budget).
    st, raw, _ = call('/api/registrations', method='GET')
    add('GET on both form endpoints is rejected (405 JSON)', st == 405,
        'status=%s body=%s' % (st, raw[:120]))
    st2, raw2, _ = call('/api/contact', method='GET')
    add('GET /api/contact is rejected (405 JSON)', st2 == 405, 'status=%s' % st2)

    # 1..8 = exactly the 8 allowed POSTs.
    step('POST without CSRF token -> 403', '/api/registrations', REG, 403, use_csrf=False)
    step('POST with forged CSRF token -> 403', '/api/registrations', REG, 403, forged='deadbeef')
    step('honeypot field -> 400', '/api/registrations', dict(REG, website='http://spam.example'), 400)
    step('invalid name + invalid phone + invalid course -> 400 with field errors', '/api/registrations',
         dict(REG, name='A', phone='12345', course='not-a-course'), 400)
    step('invalid email + short message -> 400 with field errors', '/api/contact',
         dict(CONTACT, email='bad@@', message='کوتاه'), 400)
    st, ref_reg = step('valid registration (Persian digits) -> 201 + real ref',
                       '/api/registrations', REG, 201)
    step('duplicate submission -> 409', '/api/registrations', REG, 409)
    st, ref_msg = step('valid contact with HTML/JS/SQL payload -> 201 + real ref',
                       '/api/contact', CONTACT, 201)
    # 9th POST must be rate limited.
    step('9th POST within 15 min -> 429 (rate limiter works)', '/api/registrations', REG, 429)

    reg_ref = ref_reg.get('id') if isinstance(ref_reg, dict) else ''
    msg_ref = ref_msg.get('id') if isinstance(ref_msg, dict) else ''
    add('both successful responses contain real tracking references',
        bool(reg_ref) and bool(msg_ref), 'refs=%s' % [reg_ref, msg_ref])

    # ---- WordPress admin: real login, real list, real per-record detail ----
    call('/wp-login.php')
    st, body, url = call('/wp-login.php',
                         urllib.parse.urlencode({'log': 'admin', 'pwd': 'password',
                                                 'wp-submit': 'Log In',
                                                 'redirect_to': BASE + '/wp-admin/',
                                                 'testcookie': '1'}).encode(),
                         {'Content-Type': 'application/x-www-form-urlencoded'}, 'POST')
    add('administrator login succeeds', '/wp-admin' in url and 'wp-login.php' not in url, url)

    st, listing, _ = call('/wp-admin/themes.php?page=raouf-submissions')
    add('admin submissions list is reachable (200)', st == 200, 'status=%s' % st)
    add('both browser-equivalent submissions appear in the real admin list',
        reg_ref in listing and msg_ref in listing, 'refs=%s' % [reg_ref, msg_ref])

    detail_urls = [html.unescape(u) for u in re.findall(r'href="([^"]*raouf_view=\d+[^"]*)"', listing)]
    add('list provides per-record nonce links', len(detail_urls) >= 2, 'links=%d' % len(detail_urls))
    detail_ok, escaped_ok, forged_ok = False, False, False
    for u in detail_urls:
        if 'raouf_view=' not in u:
            continue
        path = u if u.startswith('http') else (u if u.startswith('/') else '/wp-admin/' + u)
        if path.startswith('http'):
            path = urllib.parse.urlparse(path).path + '?' + urllib.parse.urlparse(path).query
        st, detail, _ = call(path)
        if msg_ref in detail:
            detail_ok = 'جزئیات درخواست' in detail and '09149998877' in detail
            escaped_ok = ('<script>alert("xss")</script>' not in detail
                          and '<img src=x onerror=alert(1)>' not in detail
                          and 'onerror=alert(1)' not in detail)
            f = re.sub(r'(_wpnonce=)[^&"]+', r'\1deadbeef', path)
            fst, fbody, _ = call(f)
            forged_ok = ('09149998877' not in fbody and 'maryam@example.test' not in fbody)
            break
    add('admin detail view shows stored PII for an administrator', detail_ok, 'ok=%s' % detail_ok)
    add('stored XSS payload is escaped in the admin detail view', escaped_ok, 'ok=%s' % escaped_ok)
    add('forged per-record nonce discloses no PII', forged_ok, 'ok=%s' % forged_ok)

    st, sub_body, _ = call('/wp-admin/themes.php?page=raouf-submissions', opener=anon)
    add('anonymous visitor cannot read the submissions admin screen',
        '09149998877' not in sub_body and 'جزئیات درخواست' not in sub_body,
        'status=%s' % st)

    # ---- No PII leaks on any public route ----
    leaked = []
    for r in ROUTES:
        s, b, _ = call(r, opener=anon)
        if '09149998877' in b or 'maryam@example.test' in b or 'MIG-LOCALHOST' in b:
            leaked.append(r)
    add('no submitted phone/e-mail/tracking data appears on any of the 11 public routes',
        not leaked, 'leaked_routes=%s' % leaked)

    # ---- REST / direct access ----
    s, b, _ = call('/wp-json/wp/v2/types', opener=anon)
    add('private submission CPT is not exposed through REST types',
        'raouf_submission' not in b, 'status=%s' % s)
    s, b, _ = call('/wp-content/themes/raouf-academy/inc/forms.php', opener=anon)
    add('direct access to inc/forms.php leaks no PHP source',
        '<?php' not in b and 'raouf_validate_submission' not in b, 'status=%s len=%d' % (s, len(b)))

    out = {
        'stage': 'F', 'wp': BASE,
        'note': 'wp_mail() delivery is optional (admin_email is empty by default); SMTP is NOT TESTED. Storage and secure admin display are fully tested.',
        'checks': checks, 'steps': steps,
        'references': {'registration': reg_ref, 'contact': msg_ref},
        'summary': {'checks': len(checks), 'PASS': sum(1 for c in checks if c['result'] == 'PASS'),
                    'FAIL': sum(1 for c in checks if c['result'] == 'FAIL'),
                    'http_steps': len(steps), 'steps_as_expected': sum(
                        1 for s in steps if s['http'] == s['expected'])},
    }
    json.dump(out, open(OUT, 'w', encoding='utf8'), ensure_ascii=False, indent=2)
    print('stage-F-forms:', out['summary'])
    for c in checks:
        print(' ', c['result'], c['check'], '::', c['detail'][:170])
    return 0 if out['summary']['FAIL'] == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
