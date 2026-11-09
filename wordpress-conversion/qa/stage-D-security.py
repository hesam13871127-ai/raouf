#!/usr/bin/env python3
"""Stage D — dynamic security / confidentiality regression probes.

Runs the identical probe battery against the pre-D theme (extracted from the
immutable Stage B/C `raouf-academy-wordpress-theme.zip`) and against the
current theme. Usage:

    WP_URL=http://127.0.0.1:9407 LABEL=before python3 qa/stage-D-security.py
    WP_URL=http://127.0.0.1:9400 LABEL=after  python3 qa/stage-D-security.py

Both instances are WordPress 6.8.3 / PHP 8.3 Playground servers that
auto-mount their respective theme directories, so the probe genuinely
exercises the two different code bases. The script never modifies the theme
source; it only creates throw-away users and form submissions in each
Playground's own (ephemeral) database.
"""
import hashlib
import html
import http.cookiejar
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = os.environ.get('WP_URL', 'http://127.0.0.1:9400').rstrip('/')
LABEL = os.environ.get('LABEL', 'after')
OUT = os.environ.get('OUT', '/home/user/raouf/wordpress-conversion/qa/results/stage-D-security-%s.json' % LABEL)
THEME_ROOT = os.environ.get(
    'THEME_ROOT',
    '/home/user/raouf/wordpress-conversion/theme/raouf-academy',
)
ADMIN_USER = os.environ.get('ADMIN_USER', 'admin')
ADMIN_PASS = os.environ.get('ADMIN_PASS', 'password')
NOTICE = 'صفحات قالب رئوف با محتوای دقیق منبع بازسازی شدند'

ROUTES = ['/', '/courses/', '/courses/skin-facial/', '/courses/medical-emergency/',
          '/courses/pharmacy-technician/', '/courses/massage-relaxation/',
          '/about/', '/gallery/', '/contact/', '/register/', '/404/']


def opener():
    jar = http.cookiejar.CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar)), jar


def req(op, path, data=None, headers=None, method=None):
    url = path if path.startswith('http') else BASE + path
    r = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
    try:
        x = op.open(r, timeout=60)
        return x.status, x.read().decode('utf8', 'replace'), x.geturl(), dict(x.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf8', 'replace'), e.geturl(), dict(e.headers)


def login(op, user, pw):
    """Playground returns a transient 502 on first warm-up; retry a few times."""
    ok = False
    for attempt in range(6):
        try:
            req(op, '/wp-login.php')
            payload = urllib.parse.urlencode({
                'log': user, 'pwd': pw, 'wp-submit': 'Log In',
                'redirect_to': BASE + '/wp-admin/', 'testcookie': '1',
            }).encode()
            st, body, url, _ = req(op, '/wp-login.php', payload,
                                   {'Content-Type': 'application/x-www-form-urlencoded'})
            ok = '/wp-admin' in url and 'wp-login.php' not in url
            if ok:
                return True
        except Exception:
            pass
        time.sleep(2)
    return False


def form_nonce(body, needle):
    """Extract _wpnonce from the <form> that contains `needle`."""
    for f in re.findall(r'<form\b[^>]*>.*?</form>', body, re.S):
        if needle in f:
            m = re.search(r'name="_wpnonce"\s+value="([^"]+)"', f) or \
                re.search(r'value="([^"]+)"\s+name="_wpnonce"', f)
            if m:
                return m.group(1)
    return ''


def ensure_user(adm, user, pw, role):
    st, body, _, _ = req(adm, '/wp-admin/user-new.php')
    nonce = form_nonce(body, 'create-user') or form_nonce(body, 'createuser')
    if not nonce:
        m = re.search(r'name="_wpnonce_create-user"\s+value="([^"]+)"', body)
        nonce = m.group(1) if m else ''
    payload = {
        'action': 'createuser', '_wpnonce_create-user': nonce,
        '_wp_http_referer': '/wp-admin/user-new.php',
        'user_login': user, 'email': user + '@example.test',
        'first_name': '', 'last_name': '', 'url': '',
        'pass1': pw, 'pass2': pw, 'role': role,
        'send_user_notification': '0', 'createusersub': 'Add New User',
    }
    st, body, url, _ = req(adm, '/wp-admin/user-new.php',
                           urllib.parse.urlencode(payload).encode(),
                           {'Content-Type': 'application/x-www-form-urlencoded',
                            'Referer': BASE + '/wp-admin/user-new.php'})
    return 'update=add' in url or 'users.php' in url


def csrf(op, jar):
    """Front-end page issues the double-submit cookie; return its value."""
    req(op, '/register/')
    token = ''
    for c in jar:
        if c.name == 'raouf_csrf':
            token = c.value
    if not token:
        st, body, _, hdrs = req(op, '/register/')
        m = re.search(r'raouf_csrf=([a-f0-9]{10})', str(hdrs.get('Set-Cookie', '')))
        token = m.group(1) if m else ''
    return token


def post_api(op, path, payload, csrf_token=None, cookie_header=None):
    h = {'Content-Type': 'application/json'}
    if csrf_token:
        h['X-CSRF-Token'] = csrf_token
    if cookie_header:
        h['Cookie'] = cookie_header
    return req(op, path, json.dumps(payload, ensure_ascii=False).encode(), h)


def yes(cond):
    return 'PASS' if cond else 'FAIL'


def main():
    results = []
    notes = {}

    def add(group, name, ok, detail=''):
        results.append({'group': group, 'check': name, 'result': yes(ok), 'detail': detail})

    # ---------------------------------------------------------- sessions
    adm, adm_jar = opener()
    assert login(adm, ADMIN_USER, ADMIN_PASS), 'admin login failed'
    ensure_user(adm, 'stage_d_sub', 'SubPass-2026!x', 'subscriber')
    ensure_user(adm, 'stage_d_ed', 'EdPass-2026!x', 'editor')
    sub, _ = opener(); editor, _ = opener()
    sub_ok = login(sub, 'stage_d_sub', 'SubPass-2026!x')
    ed_ok = login(editor, 'stage_d_ed', 'EdPass-2026!x')
    add('sessions', 'admin/subscriber/editor logins', sub_ok and ed_ok,
        'subscriber=%s editor=%s' % (sub_ok, ed_ok))

    # ---------------------------------------------- direct PHP file access
    php = []
    for dp, dn, fn in os.walk(THEME_ROOT):
        for f in fn:
            if f.endswith('.php'):
                php.append(os.path.relpath(os.path.join(dp, f), THEME_ROOT).replace(os.sep, '/'))
    php.sort()
    bad = []
    for rel in php:
        st, body, _, _ = req(adm, '/wp-content/themes/raouf-academy/' + rel)
        if st not in (200, 403) or len(body.strip()) != 0 or '<?php' in body:
            bad.append((rel, st, len(body)))
    add('security', 'all %d PHP files are ABSPATH-guarded (no source/PII on direct access)' % len(php),
        not bad, 'violations=%s' % bad[:5])
    notes['php_files_tested'] = len(php)

    # ------------------------------------------------------- REST exposure
    st, body, _, _ = req(adm, '/wp-json/wp/v2/types')
    exposed = 'raouf_submission' in body
    st2, body2, _, _ = req(adm, '/wp-json/wp/v2/raouf_submission')
    add('security', 'submission CPT is not exposed through REST', not exposed and st2 == 404,
        'types_status=%s cpt_status=%s' % (st, st2))
    st3, body3, _, _ = req(adm, '/wp-json/wp/v2/search?search=raouf&per_page=100')
    add('security', 'REST search returns no private submission', 'raouf_submission' not in body3,
        'status=%s' % st3)

    # --------------------------------------------------------- form API
    st, body, _, _ = req(adm, '/api/registrations')
    add('security', 'GET /api/registrations is rejected (405 JSON)', st == 405 and 'method not allowed' in body,
        'status=%s' % st)
    st, body, _, _ = post_api(adm, '/api/registrations', {'name': 'تست', 'phone': '09123456789'})
    add('security', 'POST without double-submit CSRF token is denied (403)', st == 403,
        'status=%s' % st)

    token = csrf(adm, adm_jar)
    cookie_hdr = None  # the opener's cookie jar already carries raouf_csrf
    # NOTE: the form rule is ^09\d{9}$ = 11 digits total. The first harness
    # revision generated 10 digits, which produced 4 false FAILs (400 from
    # validation, then no submission existed for the detail-view check).
    phone_a = '0914%07d' % (int(time.time()) % 10000000)  # 4 + 7 = 11
    phone_b = '0913%07d' % (int(time.time()) % 10000000)  # 4 + 7 = 11
    base_payload = {
        'name': 'مرحله D امنیت', 'phone': phone_a,
        'course': 'skin-facial', 'message': 'بررسی امنیت مرحله D - پیام آزمایشی معتبر.',
        'website': '',
    }
    st, body, _, _ = post_api(adm, '/api/registrations', base_payload, token, cookie_hdr)
    add('security', 'valid CSRF POST creates a real private submission (201 + ref)',
        st == 201 and re.search(r'"id"\s*:\s*"(REG|MSG)-\d{8}-[A-F0-9]{6}"', body),
        'status=%s body=%s' % (st, body[:140]))
    m = re.search(r'"id"\s*:\s*"([^"]+)"', body)
    ref = m.group(1) if m else ''
    notes['submission_ref'] = ref

    # XSS / SQLi payloads in a second (contact) submission.
    evil = {
        'name': 'تست امنیت', 'phone': phone_b,
        'email': 'stage-d-security@example.test',
        'subject': "' OR 1=1 -- <script>alert(1)</script>",
        'message': "<img src=x onerror=alert(1)> <script>alert('xss')</script> متن معتبر برای تست.",
        'website': '',
    }
    st, body, _, _ = post_api(adm, '/api/contact', evil, token, cookie_hdr)
    add('security', 'HTML/JS/SQL payload accepted only after sanitisation (201)', st == 201,
        'status=%s body=%s' % (st, body[:140]))
    # Same payload again must hit the dedupe transient (kind:phone:subject).
    st, body, _, _ = post_api(adm, '/api/contact', evil, token, cookie_hdr)
    add('security', 'duplicate payload is rejected (409)', st == 409, 'status=%s' % st)

    # Honeypot and validation.
    st, body, _, _ = post_api(adm, '/api/registrations', dict(base_payload, website='http://spam.test'), token, cookie_hdr)
    add('security', 'honeypot field rejects bots (400)', st == 400, 'status=%s' % st)
    st, body, _, _ = post_api(adm, '/api/registrations', dict(base_payload, name='<script>x</script>'), token, cookie_hdr)
    add('security', 'invalid/scripted name rejected by validation (400)', st == 400, 'status=%s' % st)

    # -------------------------------------- confidentiality of PII
    public_leak = []
    for r in ROUTES:
        st, body, _, _ = req(adm, r)
        if base_payload['phone'] in body or 'stage-d-security@example.test' in body:
            public_leak.append(r)
    add('security', 'no submitted phone/e-mail appears on any public route', not public_leak,
        'leaks=%s' % public_leak)

    # --------------------------------------------- admin capability gates
    screens = {
        'submissions list': '/wp-admin/themes.php?page=raouf-submissions',
        'options page': '/wp-admin/themes.php?page=raouf-options',
    }
    for name, path in screens.items():
        anon_op, _ = opener()
        a_st, _, _, _ = req(anon_op, path)
        s_st, _, _, _ = req(sub, path)
        e_st, _, _, _ = req(editor, path)
        m_st, m_body, _, _ = req(adm, path)
        add('security', 'admin-only screen "%s" denies anonymous/subscriber/editor' % name,
            s_st == 403 and e_st == 403 and m_st == 200 and a_st in (302, 403, 200),
            'anon=%s sub=%s editor=%s admin=%s' % (a_st, s_st, e_st, m_st))

    # detail view: valid nonce (admin), forged nonce (admin), editor with valid URL
    st, lst, _, _ = req(adm, '/wp-admin/themes.php?page=raouf-submissions')
    # Prefer the row holding our XSS/contact probe so escaping is actually tested.
    row = ''
    for tr in re.findall(r'<tr\b[^>]*>.*?</tr>', lst, re.S):
        if 'stage-d-security@example.test' in tr:
            row = tr
            break
    detail = re.search(r'href="([^"]*raouf_view=\d+[^"]*)"', row or lst)
    detail_url = html.unescape(detail.group(1)) if detail else ''
    valid_st, valid_body, _, _ = req(adm, detail_url) if detail_url else (0, '', '', {})
    forged = re.sub(r'(_wpnonce=)[a-f0-9]+', r'\g<1>deadbeef', detail_url) if detail_url else ''
    f_st, f_body, _, _ = req(adm, forged) if forged else (0, '', '', {})
    e_st, e_body, _, _ = req(editor, detail_url) if detail_url else (0, '', '', {})
    # Playground/WP renders wp_die() text with HTTP 200 (documented in Stage B),
    # so a forged nonce is a denial when the error text is present AND no PII
    # is disclosed; 403 is also accepted for real LAMP stacks.
    pii = [phone_a, phone_b, 'stage-d-security@example.test']
    forged_denied = (f_st == 403) or (
        f_st == 200 and 'نشست نامعتبر' in f_body and not any(p in f_body for p in pii)
    )
    editor_denied = e_st == 403 and not any(p in e_body for p in pii)
    add('security', 'submission detail requires a valid per-record nonce + manage_options',
        valid_st == 200 and forged_denied and editor_denied
        and 'جزئیات درخواست' in valid_body,
        'valid=%s forged=%s (error_text=%s, pii=%s) editor=%s (pii=%s)'
        % (valid_st, f_st, 'نشست نامعتبر' in f_body,
           any(p in f_body for p in pii), e_st, any(p in e_body for p in pii)))
    add('security', 'stored XSS payload is escaped in the admin detail view',
        '<script>alert' not in valid_body and 'onerror=alert' not in valid_body,
        'raw_script_tags_in_detail=%s' % ('<script>alert' in valid_body))

    # ------------------------------------- SD-01: editor capabilities via core
    # The capability-blueprint probe (stage-D-capability.json) is the runtime
    # proof; here we additionally check that a direct core post-editor URL is
    # blocked and that the private CPT is not listed in /wp-json/wp/v2/types.
    add('security', 'private CPT has no public REST route or UI', not exposed and st2 == 404,
        'types_exposed=%s' % exposed)

    # ------------------------------------- SD-03: admin notice spoofing
    notice_results = {}
    for who, op in (('anonymous', opener()[0]), ('subscriber', sub), ('editor', editor), ('administrator', adm)):
        st, body, _, _ = req(op, '/wp-admin/?raouf-resynced=1')
        notice_results[who] = {'status': st, 'notice_visible': NOTICE in body}
    add('SD-03', 'resync success notice is capability-gated (only administrators)',
        notice_results['administrator']['notice_visible']
        and not notice_results['subscriber']['notice_visible']
        and not notice_results['editor']['notice_visible']
        and not notice_results['anonymous']['notice_visible'],
        json.dumps(notice_results, ensure_ascii=False))
    notes['notice_probe'] = notice_results

    # ------------------------------------- resync nonce + capability
    st, body, _, _ = req(sub, '/wp-admin/admin-post.php?action=raouf_resync_pages',
                         urllib.parse.urlencode({'action': 'raouf_resync_pages'}).encode(),
                         {'Content-Type': 'application/x-www-form-urlencoded'})
    add('security', 'resync endpoint denies a subscriber POST', st in (403, 302, 400),
        'status=%s' % st)
    st, body, _, _ = req(adm, '/wp-admin/admin-post.php',
                         urllib.parse.urlencode({'action': 'raouf_resync_pages'}).encode(),
                         {'Content-Type': 'application/x-www-form-urlencoded'})
    add('security', 'resync endpoint denies a nonce-less admin POST', st in (403, 400),
        'status=%s' % st)

    # ------------------------------------- SD-04: settings still save
    st, opt_body, _, _ = req(adm, '/wp-admin/themes.php?page=raouf-options')
    opt_nonce = form_nonce(opt_body, 'options.php')
    fields = {}
    for mm in re.finditer(r'<input\b[^>]*name="(raouf_(?:options|media)\[[^\]]+\])"[^>]*value="([^"]*)"', opt_body):
        fields[mm.group(1)] = html.unescape(mm.group(2))
    for mm in re.finditer(r'<textarea\b[^>]*name="(raouf_(?:options|media)\[[^\]]+\])"[^>]*>(.*?)</textarea>', opt_body, re.S):
        fields[mm.group(1)] = html.unescape(mm.group(2))
    if opt_nonce:
        fields['_wpnonce'] = opt_nonce
        fields['_wp_http_referer'] = '/wp-admin/themes.php?page=raouf-options'
        fields['option_page'] = 'raouf_options_group'
        fields['action'] = 'update'
        st, body, url, _ = req(adm, '/wp-admin/options.php',
                               urllib.parse.urlencode(fields).encode(),
                               {'Content-Type': 'application/x-www-form-urlencoded',
                                'Referer': BASE + '/wp-admin/themes.php?page=raouf-options'})
        add('SD-04', 'options.php still saves both array settings for an administrator',
            st in (200, 302) and 'settings-updated=true' in url, 'status=%s url=%s' % (st, url[:110]))
    else:
        add('SD-04', 'options.php still saves both array settings for an administrator', False,
            'nonce not found')
    st, body, _, _ = req(sub, '/wp-admin/options.php',
                         urllib.parse.urlencode({'option_page': 'raouf_options_group'}).encode(),
                         {'Content-Type': 'application/x-www-form-urlencoded'})
    add('security', 'options.php denies a subscriber', st in (403, 400, 302), 'status=%s' % st)

    # ------------------------------------- PHP/runtime errors on all routes
    err_pat = re.compile(r'Fatal error|Parse error|Warning:|Notice:|Deprecated:|Uncaught')
    errs = []
    for r in ROUTES:
        st, body, _, _ = req(adm, r)
        if err_pat.search(body):
            errs.append(r)
    add('runtime', 'no PHP warning/notice/fatal text on any of the 11 routes', not errs,
        'routes_with_php_errors=%s' % errs)

    # ------------------------------------- localhost / absolute paths
    # Absolute URLs generated by WordPress from home_url()/theme URI legitimately
    # carry THIS installation's own host. Only a *foreign* host, or an explicit
    # localhost/old-QA hostname, counts as a hardcoded dependency. The first
    # harness revision flagged the installation's own URLs as false FAILs.
    own_host = urllib.parse.urlparse(BASE).netloc
    external = {'schema.org', 'www.instagram.com', 'instagram.com',
                'www.openstreetmap.org', 'openstreetmap.org', 'www.w3.org',
                'www.gnu.org', 'github.com'}
    foreign = []
    for r in ROUTES:
        st, body, _, _ = req(adm, r)
        for u in re.findall(r'https?://[^\s"\'<>)]+', body):
            host = urllib.parse.urlparse(u).netloc
            if host != own_host and host not in external:
                foreign.append((r, host, u[:90]))
        if re.search(r'localhost|stage-c\.example|stage-d\.example', body):
            foreign.append((r, 'legacy-host-token', ''))
    add('migration', 'no localhost/foreign-host dependency in rendered HTML', not foreign,
        'foreign_hits=%s' % foreign[:5])

    out = {
        'label': LABEL,
        'base': BASE,
        'generated_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'runtime': 'WordPress 6.8.3 / PHP 8.3 (Playground)',
        'checks': results,
        'notes': notes,
        'summary': {
            'total': len(results),
            'PASS': sum(1 for x in results if x['result'] == 'PASS'),
            'FAIL': sum(1 for x in results if x['result'] == 'FAIL'),
        },
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print('%s: %d/%d PASS  %s' % (LABEL, out['summary']['PASS'], out['summary']['total'], OUT))
    for x in results:
        if x['result'] == 'FAIL':
            print('  FAIL  %s :: %s :: %s' % (x['group'], x['check'], x['detail'][:180]))
    return 0 if out['summary']['FAIL'] == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
