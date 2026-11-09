#!/usr/bin/env python3
"""Stage F — localhost -> different-domain migration test.

 Generates the Playground blueprint for :9413 (`--make-blueprint`) and runs
 the verification (default). The blueprint installs the delivered ZIP content
 at a localhost URL, creates a real private form submission there, then
 changes home/siteurl to a different domain. The verification then proves:
 links/assets/fonts/forms follow the new domain, no localhost/127.0.0.1 URL
 survives, stored pages/options/submissions are intact, and the stored page
 content contains portable tokens rather than baked URLs.
"""
import http.cookiejar
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = '/home/user/raouf'
RES = os.path.join(ROOT, 'wordpress-conversion', 'qa', 'results')
BP = os.path.join(ROOT, 'wordpress-conversion', 'qa', 'stage-F-domain-blueprint.json')
OUT = os.environ.get('MIGRATION_REPORT', os.path.join(RES, 'stage-F-migration.json'))
BASE = os.environ.get('ALT_BASE', 'http://127.0.0.1:9413')
HOST = os.environ.get('ALT_HOST', 'raouf-academy.example')
ORIGIN = os.environ.get('ALT_ORIGIN', 'http://raouf-academy.example')
ROUTES = ['/', '/courses/', '/courses/skin-facial/', '/courses/medical-emergency/',
          '/courses/pharmacy-technician/', '/courses/massage-relaxation/', '/about/',
          '/gallery/', '/contact/', '/register/', '/404/']
KNOWN_EXTERNAL = ('instagram.com', 'openstreetmap.org', 'schema.org', 'w3.org',
                  'gnu.org', 'github.com', 'wordpress.org', 'gravatar.com')

PHP_BEFORE = r"""<?php
require_once '/wordpress/wp-load.php';
$id = wp_insert_post( array(
    'post_type'    => 'raouf_submission',
    'post_status'  => 'private',
    'post_title'   => 'MIGRATION-LOCALHOST-SEED',
    'post_content' => 'real data created while the site was on localhost',
), true );
if ( ! is_wp_error( $id ) && $id ) {
    update_post_meta( $id, '_raouf_ref', 'MIG-LOCALHOST-0001' );
    update_post_meta( $id, '_raouf_kind', 'contact' );
    update_post_meta( $id, '_raouf_name', 'داده مهاجرت' );
    update_post_meta( $id, '_raouf_phone', '09140000000' );
}
$pages = get_posts( array( 'post_type' => 'page', 'post_status' => 'publish', 'numberposts' => -1 ) );
$tokens = 0; $hosts = 0;
foreach ( $pages as $p ) {
    $tokens += substr_count( $p->post_content, '{{' );
    $hosts  += preg_match_all( '/https?:\/\//', $p->post_content );
}
$state = array(
    'phase'                    => 'localhost',
    'home'                     => get_option( 'home' ),
    'siteurl'                  => get_option( 'siteurl' ),
    'home_url'                 => home_url( '/' ),
    'blogname'                 => get_option( 'blogname' ),
    'permalink_structure'      => get_option( 'permalink_structure' ),
    'show_on_front'            => get_option( 'show_on_front' ),
    'page_on_front'            => (int) get_option( 'page_on_front' ),
    'pages'                    => count( $pages ),
    'token_count_in_pages'     => $tokens,
    'hardcoded_hosts_in_pages' => $hosts,
    'raouf_options'            => get_option( 'raouf_options', array() ),
    'raouf_media'              => get_option( 'raouf_media', array() ),
    'seeded_submission_id'     => is_wp_error( $id ) ? 0 : (int) $id,
    'seeded_submission_ref'    => 'MIG-LOCALHOST-0001',
);
file_put_contents( '/wordpress/wp-content/stage-F-domain-before.json',
    wp_json_encode( $state, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT ) );
"""

PHP_AFTER = r"""<?php
require_once '/wordpress/wp-load.php';
/* Playground pins WP_HOME/WP_SITEURL as PHP constants, so setSiteOptions cannot
   change them. On a real host Settings > General writes exactly these options;
   do the same here so the stored-settings migration is genuinely exercised. */
update_option( 'home', 'http://raouf-academy.example' );
update_option( 'siteurl', 'http://raouf-academy.example' );
flush_rewrite_rules();
$q = new WP_Query( array(
    'post_type' => 'raouf_submission', 'post_status' => 'private',
    'posts_per_page' => -1, 'fields' => 'ids',
) );
$ids = array();
foreach ( $q->posts as $x ) { $ids[] = (int) $x; }
$pages = get_posts( array( 'post_type' => 'page', 'post_status' => 'publish', 'numberposts' => -1 ) );
$tokens = 0; $hosts = 0;
foreach ( $pages as $p ) {
    $tokens += substr_count( $p->post_content, '{{' );
    $hosts  += preg_match_all( '/https?:\/\//', $p->post_content );
}
$state = array(
    'phase'                    => 'after-domain-change',
    'home'                     => get_option( 'home' ),
    'siteurl'                  => get_option( 'siteurl' ),
    'home_url'                 => home_url( '/' ),
    'site_url'                 => site_url( '/' ),
    'pages'                    => count( $pages ),
    'token_count_in_pages'     => $tokens,
    'hardcoded_hosts_in_pages' => $hosts,
    'private_submission_ids'   => $ids,
    'raouf_options'            => get_option( 'raouf_options', array() ),
    'raouf_media'              => get_option( 'raouf_media', array() ),
);
file_put_contents( '/wordpress/wp-content/stage-F-domain-after.json',
    wp_json_encode( $state, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT ) );
"""


def make_blueprint():
    bp = {
        '$schema': 'https://playground.wordpress.net/blueprint-schema.json',
        'landingPage': '/',
        'preferredVersions': {'php': '8.3', 'wp': 'http://127.0.0.1:9401/wordpress.zip'},
        'features': {'networking': True},
        'steps': [
            {'step': 'setSiteOptions', 'options': {
                'blogname': 'آموزشگاه فنی و حرفه‌ای رئوف',
                'permalink_structure': '/%postname%/',
                'home': BASE, 'siteurl': BASE}},
            {'step': 'activateTheme', 'themeFolderName': 'raouf-academy'},
            {'step': 'runPHP', 'code': PHP_BEFORE},
            {'step': 'setSiteOptions', 'options': {
                'home': ORIGIN, 'siteurl': ORIGIN}},
            {'step': 'runPHP', 'code': PHP_AFTER},
        ],
    }
    json.dump(bp, open(BP, 'w', encoding='utf8'), ensure_ascii=False, indent=2)
    print('wrote', BP)


def get(url, method='GET', data=None, headers=None, opener=None, host=True):
    """Request the alternate-domain origin but connect to the local port."""
    p = urllib.parse.urlparse(url)
    p = p._replace(netloc='127.0.0.1:9413')
    h = {'User-Agent': 'Stage-F-Migration/1.0'}
    if host:
        h['Host'] = HOST
    if headers:
        h.update(headers)
    req = urllib.request.Request(p.geturl(), data=data, method=method, headers=h)
    try:
        if opener is not None:
            r = opener.open(req, timeout=60)
        else:
            r = urllib.request.urlopen(req, timeout=60)
        return r.status, r.read(), r.headers
    except urllib.error.HTTPError as e:
        return e.code, e.read(), e.headers


def main():
    checks = []

    def add(name, ok, detail):
        checks.append({'check': name, 'result': 'PASS' if ok else 'FAIL', 'detail': str(detail)[:400]})

    # Stored state written by the blueprint's runPHP steps.
    raw_before = get(ORIGIN + '/wp-content/stage-F-domain-before.json')[1]
    raw_after = get(ORIGIN + '/wp-content/stage-F-domain-after.json')[1]
    try:
        before, after = json.loads(raw_before), json.loads(raw_after)
    except Exception as e:
        print('state files unavailable:', e, raw_before[:200], raw_after[:200])
        return 1
    add('blueprint recorded the localhost phase and the post-change phase',
        before.get('phase') == 'localhost' and after.get('phase') == 'after-domain-change',
        'before_home=%s after_home=%s' % (before.get('home'), after.get('home')))
    add('WordPress home/siteurl now resolve to the different domain',
        ORIGIN in str(after.get('home', '')) and ORIGIN in str(after.get('home_url', '')),
        'home=%s home_url=%s' % (after.get('home'), after.get('home_url')))
    add('all 10 source pages survive the domain change with portable tokens and 0 baked hosts',
        after.get('pages', 0) >= 10 and after.get('token_count_in_pages', 0) > 0
        and after.get('hardcoded_hosts_in_pages', 0) == 0,
        'pages=%s tokens=%s hosts=%s' % (after.get('pages'), after.get('token_count_in_pages'), after.get('hardcoded_hosts_in_pages')))
    add('private form submission created on localhost survives the domain change',
        len(after.get('private_submission_ids', [])) > 0 and before.get('seeded_submission_id', 0) in after.get('private_submission_ids', []),
        'seed=%s ids=%s' % (before.get('seeded_submission_id'), after.get('private_submission_ids')))
    opts = after.get('raouf_options') or {}
    official = ('site_name', 'phone_display', 'phone_tel', 'address', 'instagram_user', 'instagram_url')
    # Default options are not stored until an admin saves them: an empty array
    # is the correct, test-data-free state. If saved, they must be official.
    if opts:
        ok = ('+98 9141 803287' in str(opts.get('phone_display', ''))
              and 'academi_raouf' in str(opts.get('instagram_user', '')))
    else:
        ok = True
    add('stored theme options contain no sample/test data', ok,
        'raouf_options=%s' % json.dumps(opts, ensure_ascii=False)[:200])
    add('stored media overrides are empty (official source images are used)',
        not after.get('raouf_media'), 'raouf_media=%s' % after.get('raouf_media'))

    # All routes under the NEW domain: links, assets, fonts, SEO, tokens, PHP errors.
    rows = []
    total_internal, broken, foreign, leaked = 0, [], [], []
    banned = re.compile(r'127\.0\.0\.1|localhost|stage-[cd]\.example|{{', re.I)
    for route in ROUTES:
        st, body, _ = get(ORIGIN + route)
        html = body.decode('utf8', 'replace')
        urls = set()
        for tag in re.findall(r'<(?:a|img|link|script|source|use|form)\b[^>]*>', html):
            for attr in ('href', 'src', 'srcset', 'data-full', 'action'):
                for v in re.findall(r'\b' + attr + r'=[\'"]([^\'"]*)[\'"]', tag):
                    # A data: URI is an inline placeholder, not a network URL.
                    # Skipping it as a whole also avoids treating its base64
                    # payload (which contains commas) as a separate URL.
                    if v.startswith('data:'):
                        continue
                    for part in v.split(','):
                        u = part.strip().split(' ')[0]
                        if u and not u.startswith(('data:', 'mailto:', 'tel:', 'javascript:', '#')):
                            urls.add(u)
        internal = sorted(u for u in urls if u.startswith('/') or u.startswith(ORIGIN))
        external = sorted(u for u in urls if not (u.startswith('/') or u.startswith(ORIGIN)))
        rb = []
        for u in internal:
            target = ORIGIN + u if u.startswith('/') else u
            s, _, _ = get(target)
            path = urllib.parse.urlparse(target).path.rstrip('/')
            if s >= 400 and not (path == '/404' and s == 404):
                rb.append({'url': u, 'status': s})
        unknown = [u for u in external if not any(h in u for h in KNOWN_EXTERNAL)]
        banned_hits = banned.findall(html)
        can = len(re.findall(r'rel=["\']canonical["\']', html))
        rob = len(re.findall(r'<meta name=["\']robots["\']', html))
        php = re.findall(r'(?:Fatal error|Parse error|Warning|Notice|Deprecated):[^<\n]{0,120}', html)
        rec = {'route': route, 'http': st, 'internal_links': len(internal), 'external_links': len(external),
               'broken': rb, 'unknown_external': unknown, 'banned_url_hits': banned_hits,
               'canonical': can, 'robots': rob, 'leaked_tokens': html.count('{{'), 'php_errors': php,
               'ok': st in (200, 404) and not rb and not unknown and not banned_hits
                     and can == 1 and rob == 1 and html.count('{{') == 0 and not php}
        rows.append(rec)
        total_internal += len(internal)
        broken += rb
        foreign += unknown
        if banned_hits or html.count('{{'):
            leaked.append(route)
    add('all 11 routes on the new domain: 0 broken links, 0 foreign hosts, 0 localhost/127.0.0.1 URLs, 0 leaked tokens, 0 PHP errors',
        all(r['ok'] for r in rows),
        'internal_checked=%d broken=%d foreign=%d banned_routes=%s' % (total_internal, len(broken), len(foreign), leaked))

    # Fonts, CSS and JS are loadable under the new domain.
    assets = ['/wp-content/themes/raouf-academy/style.css',
              '/wp-content/themes/raouf-academy/assets/js/app.js',
              '/wp-content/themes/raouf-academy/assets/fonts/vazirmatn-arabic-wght-normal.woff2',
              '/wp-content/themes/raouf-academy/assets/fonts/vazirmatn-latin-wght-normal.woff2',
              '/wp-content/themes/raouf-academy/assets/fonts/vazirmatn-latin-ext-wght-normal.woff2',
              '/wp-content/themes/raouf-academy/assets/images/raouf-logo.jpg']
    asset_rows = []
    for a in assets:
        s, _, _ = get(ORIGIN + a)
        asset_rows.append({'asset': a, 'status': s})
    add('CSS, JS, all 3 fonts and the logo load on the new domain',
        all(x['status'] == 200 for x in asset_rows), json.dumps(asset_rows))

    # A real form submission works after migration (browser-equivalent HTTP).
    jar = http.cookiejar.CookieJar()
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    get(ORIGIN + '/register/', opener=op)
    token = next((c.value for c in jar if c.name == 'raouf_csrf'), '')
    # Unique per run so a re-run of this suite is not blocked by the theme's
    # 10-minute duplicate-submission transient (a correct 409, not a defect).
    import time
    uniq = str(int(time.time()) % 10000000).zfill(7)
    payload = json.dumps({'name': 'مهاجرت دامنه', 'phone': '0914' + uniq,
                          'email': '', 'subject': 'تست پس از تغییر دامنه ' + uniq,
                          'message': 'بررسی عملکرد فرم تماس پس از انتقال به دامنه جدید.',
                          'website': ''}, ensure_ascii=False).encode('utf8')
    st, body, _ = get(ORIGIN + '/api/contact', method='POST', data=payload,
                      headers={'Content-Type': 'application/json', 'X-CSRF-Token': token}, opener=op)
    try:
        parsed = json.loads(body)
    except Exception:
        parsed = body.decode('utf8', 'replace')[:200]
    add('contact form really saves a private submission on the new domain (201 + ref)',
        st == 201 and isinstance(parsed, dict) and parsed.get('ok') is True,
        'status=%s body=%s' % (st, json.dumps(parsed, ensure_ascii=False)[:200]))

    # Rendered HTML on the new domain is origin-normalised-identical to :9411.
    parity = []
    for route in ROUTES:
        s2, b2, _ = get(ORIGIN + route)
        try:
            b1 = urllib.request.urlopen(urllib.request.Request(
                'http://127.0.0.1:9411' + route, headers={'User-Agent': 'Stage-F-Migration/1.0'}), timeout=60).read()
        except urllib.error.HTTPError as e:
            b1 = e.read()
        def normalise(raw, origin):
            s = raw.replace(origin, '<ORIGIN>').replace('http://127.0.0.1:9411', '<ORIGIN>')
            s = s.replace('127.0.0.1:9413', '<ORIGIN>').replace('127.0.0.1:9411', '<ORIGIN>')
            # Two independent fresh databases legitimately have different
            # auto-increment IDs; they are installation metadata, not content.
            s = re.sub(r'page-id-\d+', 'page-id-<ID>', s)
            s = re.sub(r'parent-pageid-\d+', 'parent-pageid-<ID>', s)
            s = re.sub(r'postid-\d+', 'postid-<ID>', s)
            s = re.sub(r'menu-item-(\d+)', 'menu-item-<ID>', s)
            s = re.sub(r'id="menu-item-\d+"', 'id="menu-item-<ID>"', s)
            s = re.sub(r'wp-json/wp/v2/pages/\d+', 'wp-json/wp/v2/pages/<ID>', s)
            return s
        n2 = normalise(b2.decode('utf8', 'replace'), ORIGIN)
        n1 = normalise(b1.decode('utf8', 'replace'), ORIGIN)
        parity.append({'route': route, 'identical_after_origin_normalisation': n1 == n2,
                       'lengths': [len(n1), len(n2)]})
    add('origin-normalised HTML is identical on localhost and on the different domain (11 routes)',
        all(p['identical_after_origin_normalisation'] for p in parity),
        'identical=%d/%d' % (sum(p['identical_after_origin_normalisation'] for p in parity), len(parity)))

    out = {'stage': 'F', 'alternate_origin': ORIGIN, 'alternate_host': HOST,
           'base': BASE, 'blueprint': 'qa/stage-F-domain-blueprint.json',
           'before': before, 'after': after, 'routes': rows, 'assets': asset_rows,
           'form_after_migration': {'status': st, 'body': parsed}, 'origin_parity': parity,
           'checks': checks,
           'summary': {'checks': len(checks), 'PASS': sum(1 for c in checks if c['result'] == 'PASS'),
                       'FAIL': sum(1 for c in checks if c['result'] == 'FAIL'),
                       'routes': len(rows), 'routes_ok': sum(1 for r in rows if r['ok']),
                       'internal_links_checked': total_internal, 'broken_links': len(broken),
                       'unknown_external': len(foreign)}}
    json.dump(out, open(OUT, 'w', encoding='utf8'), ensure_ascii=False, indent=2)
    print('stage-F-migration:', out['summary'])
    for c in checks:
        print(' ', c['result'], c['check'], '::', c['detail'][:180])
    return 0 if out['summary']['FAIL'] == 0 else 1


if __name__ == '__main__':
    if '--make-blueprint' in sys.argv:
        make_blueprint()
    else:
        sys.exit(main())
