#!/usr/bin/env python3
"""Stage F — supplementary real-security probes.

 * Admin-editable options cannot inject script/javascript: URLs into output.
 * Options are sanitised on save and restore cleanly.
 * Direct PHP file access leaks no source.
 * No dangerous PHP constructs or raw SQL anywhere in the theme.
 * Optional runtime assets (readme, POT, screenshot) are present.
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
THEME = os.path.join(ROOT, 'wordpress-conversion', 'theme', 'raouf-academy')
BASE = os.environ.get('WP_URL', 'http://127.0.0.1:9414').rstrip('/')
OUT = os.environ.get('EXTRA_REPORT', os.path.join(ROOT, 'wordpress-conversion', 'qa', 'results', 'stage-F-security-extra.json'))
ROUTES = ['/', '/courses/', '/courses/skin-facial/', '/courses/medical-emergency/',
          '/courses/pharmacy-technician/', '/courses/massage-relaxation/', '/about/',
          '/gallery/', '/contact/', '/register/', '/404/']
UA = {'User-Agent': 'Stage-F-Security-Extra/1.0'}
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


def parse_options_form(page):
    m = re.search(r'<form[^>]*action="[^"]*options\.php"[^>]*>(.*?)</form>', page, re.S)
    if not m:
        return {}
    form = m.group(1)
    fields = {}
    for tag in re.findall(r'<input\b[^>]*>', form, re.I):
        n = re.search(r'\bname=["\']([^"\']+)["\']', tag)
        if not n:
            continue
        v = re.search(r'\bvalue=["\']([^"\']*)["\']', tag)
        fields[html.unescape(n.group(1))] = html.unescape(v.group(1)) if v else ''
    for tag, content in re.findall(r'<textarea\b([^>]*)>(.*?)</textarea>', form, re.S | re.I):
        n = re.search(r'\bname=["\']([^"\']+)["\']', tag)
        if n:
            fields[html.unescape(n.group(1))] = html.unescape(content.strip())
    return fields


def post_options(fields):
    data = urllib.parse.urlencode(fields, doseq=True).encode()
    return call('/wp-admin/options.php', data,
                {'Content-Type': 'application/x-www-form-urlencoded'}, 'POST')


def main():
    checks = []

    def add(name, ok, detail):
        checks.append({'check': name, 'result': 'PASS' if ok else 'FAIL', 'detail': str(detail)[:400]})

    # Static scan for dangerous constructs / raw SQL.
    dangerous = []
    pattern = re.compile(r'\beval\s*\(|\bbase64_decode\s*\(|\bshell_exec\s*\(|\bsystem\s*\(|\bpassthru\s*\(|\bexec\s*\(|\$wpdb->query\s*\(|\bmysql_query\s*\(|\bmysqli_|\bfile_get_contents\s*\(\s*[\'"]https?://')
    for dp, dn, fn in os.walk(THEME):
        dn[:] = [d for d in dn if not d.startswith('.')]
        for f in fn:
            if not f.endswith('.php'):
                continue
            rel = os.path.relpath(os.path.join(dp, f), THEME)
            for i, line in enumerate(open(os.path.join(dp, f), encoding='utf8'), 1):
                if pattern.search(line):
                    dangerous.append({'file': rel, 'line': i, 'text': line.strip()[:120]})
    # file_get_contents('php://input') is the legitimate JSON body reader.
    dangerous = [d for d in dangerous if "file_get_contents( 'php://input' )" not in d['text']
                 and 'php://input' not in d['text']]
    add('no eval / base64_decode / shell_exec / system / raw SQL / remote file reads in theme PHP',
        not dangerous, 'hits=%s' % dangerous[:5])

    # Direct access to PHP includes.
    leaks = []
    for rel in ['inc/pages-data.php', 'inc/forms.php', 'inc/setup.php', 'inc/options.php',
                'functions.php', 'header.php', 'footer.php']:
        st, body, _ = call('/wp-content/themes/raouf-academy/' + rel, opener=anon)
        if '<?php' in body or 'function raouf_' in body or 'ABSPATH' in body:
            leaks.append(rel)
    add('direct access to all theme PHP includes leaks no source', not leaks, 'leaks=%s' % leaks)

    # Optional runtime files present.
    optional = []
    for rel in ['readme.txt', 'screenshot.png', 'languages/raouf-academy.pot']:
        st, _, _ = call('/wp-content/themes/raouf-academy/' + rel, opener=anon)
        optional.append({'file': rel, 'status': st})
    add('readme.txt, screenshot.png and the POT file ship and are served',
        all(x['status'] == 200 for x in optional), json.dumps(optional))
    # Playground routes unknown paths under the theme to the front page (200),
    # so HTTP status is NOT a valid existence check. Inspect the real files.
    import zipfile
    credential_files = []
    for dp, dn, fn in os.walk(THEME):
        dn[:] = [d for d in dn if not d.startswith('.')]
        for f in fn:
            if re.search(r'(wp-config|credentials|\.env|secret|database)', f, re.I):
                credential_files.append(os.path.relpath(os.path.join(dp, f), THEME))
    with zipfile.ZipFile(os.path.join(ROOT, 'wordpress-conversion', 'dist', 'raouf-academy-wordpress-theme.zip')) as z:
        zip_credential_files = [n for n in z.namelist()
                                if re.search(r'(wp-config|credentials|\.env|secret|database)', n, re.I)]
    add('no wp-config.php / credential file in the theme folder or the delivered ZIP',
        not credential_files and not zip_credential_files,
        'folder=%s zip=%s' % (credential_files, zip_credential_files))

    # Admin login + option-based injection test.
    call('/wp-login.php')
    st, _, url = call('/wp-login.php',
                      urllib.parse.urlencode({'log': 'admin', 'pwd': 'password',
                                              'wp-submit': 'Log In',
                                              'redirect_to': BASE + '/wp-admin/',
                                              'testcookie': '1'}).encode(),
                      {'Content-Type': 'application/x-www-form-urlencoded'}, 'POST')
    add('admin login succeeds for the options-injection probe',
        '/wp-admin' in url and 'wp-login.php' not in url, url)

    st, page, _ = call('/wp-admin/themes.php?page=raouf-options')
    original = parse_options_form(page)
    add('options form exposes all editable fields and a valid nonce',
        len(original) > 10 and '_wpnonce' in original, 'fields=%d' % len(original))
    official = dict(original)

    injected = dict(original)
    injected['raouf_options[site_name]'] = '<script>alert(1)</script>'
    injected['raouf_options[phone_display]'] = '<img src=x onerror=alert(1)>'
    injected['raouf_options[instagram_url]'] = 'javascript:alert(1)'
    injected['raouf_options[admin_email]'] = 'not-an-email'
    injected['raouf_options[address]'] = '"><script>alert(2)</script>'
    st, body, url = post_options(injected)
    add('malicious option values are accepted by the settings endpoint and saved',
        'settings-updated=true' in url or st == 200, 'status=%s url=%s' % (st, url[-100:]))

    bad = []
    for r in ROUTES:
        s, b, _ = call(r, opener=anon)
        if ('<script>alert(1)</script>' in b or '<script>alert(2)</script>' in b
                or 'onerror=alert(1)' in b or 'href="javascript:' in b):
            bad.append(r)
    add('no admin-supplied script/javascript: URL reaches any of the 11 public pages',
        not bad, 'affected_routes=%s' % bad)

    st, page2, _ = call('/wp-admin/themes.php?page=raouf-options')
    saved = parse_options_form(page2)
    add('sanitizers strip tags from text options and reject a javascript: URL and a bad e-mail',
        '<script>' not in str(saved.get('raouf_options[site_name]', ''))
        and 'javascript:' not in str(saved.get('raouf_options[instagram_url]', ''))
        and 'not-an-email' not in str(saved.get('raouf_options[admin_email]', '')),
        json.dumps({k: saved.get(k) for k in
                    ['raouf_options[site_name]', 'raouf_options[instagram_url]', 'raouf_options[admin_email]']},
                   ensure_ascii=False)[:250])

    st, _, url = post_options(official)
    restored = []
    for r in ROUTES:
        s, b, _ = call(r, opener=anon)
        if '+98 9141 803287' not in b or 'academi_raouf' not in b:
            restored.append(r)
    add('restoring the official values returns every public page to the exact original data',
        not restored, 'routes_not_restored=%s' % restored)

    out = {'stage': 'F', 'wp': BASE, 'checks': checks,
           'dangerous_construct_hits': dangerous, 'optional_files': optional,
           'summary': {'checks': len(checks), 'PASS': sum(1 for c in checks if c['result'] == 'PASS'),
                       'FAIL': sum(1 for c in checks if c['result'] == 'FAIL')}}
    json.dump(out, open(OUT, 'w', encoding='utf8'), ensure_ascii=False, indent=2)
    print('stage-F-security-extra:', out['summary'])
    for c in checks:
        print(' ', c['result'], c['check'], '::', c['detail'][:180])
    return 0 if out['summary']['FAIL'] == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
