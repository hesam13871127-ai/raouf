#!/usr/bin/env python3
"""Stage C — route-by-route integration audit of the WordPress theme.

Compares every original route with its WordPress rendering:
  * HTTP status and WordPress template assignment
  * full normalised DOM (every tag, attribute, class, id, text node, SVG)
  * SEO metadata (title, description, canonical, robots, OG, Twitter, JSON-LD)
  * internal links, CSS/JS/image/font assets and their real HTTP status
  * PHP error strings in the response body
  * 404 behaviour, token storage, course-page individuality, forms

Only legitimate WordPress adaptations are normalised away (installation URL,
theme directory, ?ver=, WP body classes, enqueued stylesheet/script tags,
and the origin inside JSON-LD). No content is invented or ignored silently.
"""
import hashlib
import html.parser
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = '/home/user/raouf'
CONV = os.path.join(ROOT, 'wordpress-conversion')
SRC = os.path.join(ROOT, '.work', 'wp-source', 'raouf-academy', 'public')
THEME = os.path.join(CONV, 'theme', 'raouf-academy')
OUT = os.path.join(CONV, 'qa', 'results', 'stage-C-audit.json')
ORIG = os.environ.get('ORIG_URL', 'http://127.0.0.1:3000')
WP = os.environ.get('WP_URL', 'http://127.0.0.1:9400')

ROUTES = [
    ('/', 'index.html', 'front-page.php'),
    ('/courses/', 'courses/index.html', 'page-courses.php'),
    ('/courses/skin-facial/', 'courses/skin-facial/index.html', 'page-skin-facial.php'),
    ('/courses/medical-emergency/', 'courses/medical-emergency/index.html', 'page-medical-emergency.php'),
    ('/courses/pharmacy-technician/', 'courses/pharmacy-technician/index.html', 'page-pharmacy-technician.php'),
    ('/courses/massage-relaxation/', 'courses/massage-relaxation/index.html', 'page-massage-relaxation.php'),
    ('/about/', 'about/index.html', 'page-about.php'),
    ('/gallery/', 'gallery/index.html', 'page-gallery.php'),
    ('/contact/', 'contact/index.html', 'page-contact.php'),
    ('/register/', 'register/index.html', 'page-register.php'),
    ('/404/', '404/index.html', '404.php'),
]
WP_ORIGIN = WP
WP_THEME = WP + '/wp-content/themes/raouf-academy'


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Stage-C-Audit/1.0'})
    try:
        r = urllib.request.urlopen(req, timeout=60)
        return r.status, r.read().decode('utf8', 'replace')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf8', 'replace')


def status_only(url):
    req = urllib.request.Request(url, method='HEAD', headers={'User-Agent': 'Stage-C-Audit/1.0'})
    try:
        return urllib.request.urlopen(req, timeout=30).status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        # Some Playground builds reject HEAD; fall back to GET.
        return get(url)[0]


def sha(path):
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


# ---------------------------------------------------------------- normalise
STYLESHEET_LINK = re.compile(r"<link\b[^>]*rel=['\"]stylesheet['\"][^>]*>", re.I)
APP_SCRIPT = re.compile(r"<script\b[^>]*app\.js[^>]*>\s*</script>", re.I)


def normalise(s, wp=False):
    if wp:
        s = s.replace(WP_THEME + '/', '/')
        s = s.replace(WP_ORIGIN + '/', '/')
        s = s.replace(WP_ORIGIN, '/')
    else:
        s = s.replace('http://localhost:3000/', '/').replace('http://127.0.0.1:3000/', '/')
        s = s.replace('http://localhost:3000', '/').replace('http://127.0.0.1:3000', '/')
    s = re.sub(r'\?ver=[\w.\-]+', '', s)
    # WP enqueues CSS/JS through its API; the two tags are checked separately.
    s = STYLESHEET_LINK.sub('', s)
    s = APP_SCRIPT.sub('<script src="/assets/js/app.js" defer></script>', s)
    # WP adds its own body classes; keep the original data-page marker.
    s = re.sub(r'<body\b[^>]*\bdata-page="([^"]+)"[^>]*>', r'<body data-page="\1">', s)
    s = re.sub(r'<body\b[^>]*>', '<body>', s)
    return s


class Tokens(html.parser.HTMLParser):
    """Exact tag/attribute/text stream, ignoring only formatting whitespace."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []

    def handle_starttag(self, tag, attrs):
        a = []
        for k, v in sorted(attrs):
            v = '' if v is None else re.sub(r'\s+', ' ', v).strip()
            a.append((k, v))
        self.out.append(('tag', tag, tuple(a)))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        self.out.append(('end', tag))

    def handle_data(self, data):
        if data.strip():
            self.out.append(('text', re.sub(r'\s+', ' ', data).strip()))


def token_stream(s):
    p = Tokens()
    p.feed(s)
    return p.out


def first_diff(a, b):
    for i, (x, y) in enumerate(zip(a, b)):
        if x != y:
            return {'index': i, 'original': repr(x)[:220], 'wordpress': repr(y)[:220]}
    return {'index': min(len(a), len(b)), 'original': '<end>', 'wordpress': '<end>'}


# ---------------------------------------------------------------- SEO tags
SEO_META_NAMES = {'description', 'theme-color', 'robots', 'author'}
SEO_PROPS = ('og:',)


def seo(s):
    """Extract comparable SEO metadata from a <head> fragment."""
    h = s[s.find('<head>'):s.find('</head>')]
    out = {'title': (re.findall(r'<title>(.*?)</title>', h, re.S) or [''])[0].strip()}
    out['meta'] = {}
    for tag in re.findall(r'<meta\b[^>]*>', h):
        name = (re.findall(r'\bname="([^"]+)"', tag) or [''])[0]
        prop = (re.findall(r'\bproperty="([^"]+)"', tag) or [''])[0]
        content = (re.findall(r'\bcontent="([^"]*)"', tag) or [''])[0]
        if name in SEO_META_NAMES or name.startswith('twitter:') or prop.startswith(SEO_PROPS):
            out['meta'][name or prop] = content
    out['canonical'] = [re.findall(r'\bhref="([^"]*)"', t)[0] for t in re.findall(r'<link\b[^>]*rel="canonical"[^>]*>', h)]
    out['robots'] = len(re.findall(r'<meta\b[^>]*name="robots"', h))
    out['icon'] = [(re.findall(r'\bhref="([^"]*)"', t) or [''])[0] for t in re.findall(r'<link\b[^>]*rel="icon"[^>]*>', h)]
    out['preload'] = [(re.findall(r'\bhref="([^"]*)"', t) or [''])[0] for t in re.findall(r'<link\b[^>]*rel="preload"[^>]*>', h)]
    ld = re.findall(r'<script type="application/ld\+json">(.*?)</script>', h, re.S)
    out['jsonld'] = []
    for raw in ld:
        try:
            out['jsonld'].append(json.loads(raw.strip()))
        except Exception:
            out['jsonld'].append({'invalid': raw[:200]})
    return out


def canon_seo(d):
    """Canonicalise absolute origins inside SEO values so both sides compare."""
    def fix(v):
        if isinstance(v, str):
            return v.replace('http://localhost:3000', 'ORIGIN').replace(WP_ORIGIN, 'ORIGIN')
        if isinstance(v, list):
            return [fix(x) for x in v]
        if isinstance(v, dict):
            return {k: fix(x) for k, x in v.items()}
        return v
    return fix(d)


# ---------------------------------------------------------------- links
def links(s):
    out = []
    for tag in re.findall(r'<(?:a|img|link|script|source|use)\b[^>]*>', s):
        for attr in ('href', 'src', 'srcset', 'data-full'):
            for v in re.findall(r'\b' + attr + r"=['\"]([^\"']*)['\"]", tag):
                for part in v.split(','):
                    u = part.strip().split(' ')[0]
                    if u:
                        out.append(u)
    return out


def classify(u):
    if u.startswith(('data:', 'mailto:', 'tel:', 'javascript:', '#')):
        return 'non-http'
    p = urllib.parse.urlparse(u)
    if p.scheme in ('http', 'https'):
        return ('internal' if p.netloc in ('127.0.0.1:9400', '127.0.0.1:3000', 'localhost:3000') else 'external')
    return 'internal' if u.startswith('/') else 'relative'


def resolve(u):
    if u.startswith('/'):
        return WP + u
    if u.startswith('http://127.0.0.1:9400'):
        return u
    return None


# ---------------------------------------------------------------- main
def main():
    audit = {
        'stage': 'C', 'orig': ORIG, 'wp': WP,
        'routes': [], 'summary': {}, 'issues': [],
    }
    source_files = {}
    for route, rel, tpl in ROUTES:
        source_files[route] = os.path.join(SRC, rel)

    # 0. Static assets parity against the authoritative source.
    src_css = os.path.join(SRC, 'assets', 'css', 'style.css')
    src_js = os.path.join(SRC, 'assets', 'js', 'app.js')
    theme_css = os.path.join(THEME, 'style.css')
    theme_js = os.path.join(THEME, 'assets', 'js', 'app.js')
    ref_css = os.path.join(THEME, 'assets', 'css', 'style.css.source.css')
    src_images = {}
    for dp, _, fn in os.walk(os.path.join(SRC, 'assets')):
        for f in fn:
            if f.lower().endswith(('.webp', '.jpg', '.jpeg', '.png', '.svg', '.woff2')):
                p = os.path.join(dp, f)
                src_images[os.path.relpath(p, SRC)] = sha(p)
    theme_images = {}
    for dp, _, fn in os.walk(os.path.join(THEME, 'assets')):
        for f in fn:
            if f.lower().endswith(('.webp', '.jpg', '.jpeg', '.png', '.svg', '.woff2')):
                p = os.path.join(dp, f)
                rel = os.path.relpath(p, THEME)
                # source CSS reference is not an original asset
                if rel.endswith('style.css.source.css'):
                    continue
                theme_images[rel] = sha(p)
    mismatch = sorted(k for k in src_images if k not in theme_images or theme_images[k] != src_images[k])
    extra = sorted(k for k in theme_images if k not in src_images)
    audit['assets'] = {
        'original_assets': len(src_images), 'theme_assets': len(theme_images),
        'asset_sha256_mismatches': mismatch, 'unexpected_theme_assets': extra,
        'js_byte_identical': sha(src_js) == sha(theme_js),
        'reference_css_byte_identical': sha(src_css) == sha(ref_css),
        'theme_css_differs_from_original': sha(src_css) != sha(theme_css),
        'theme_css_note': 'Only the WP header + 3 @font-face path rewrites (see docs/DECISIONS.md D13).',
        'css_js_http': {'style.css': status_only(WP + '/wp-content/themes/raouf-academy/style.css'),
                        'app.js': status_only(WP + '/wp-content/themes/raouf-academy/assets/js/app.js')},
    }

    # 1. WordPress template assignment from the REST API.
    try:
        pages = json.loads(get(WP + '/wp-json/wp/v2/pages?per_page=100&_fields=id,slug,parent,template,link,content')[1])
        audit['wp_pages'] = [{'id': p['id'], 'slug': p['slug'], 'parent': p['parent'],
                              'template': p.get('template', ''), 'link': p['link'],
                              'tokens': {'ASSET': p['content']['rendered'].count('{{ASSET:'),
                                         'LINK': p['content']['rendered'].count('{{LINK:')},
                              'hardcoded_hosts': len(re.findall(r'https?://', p['content']['rendered']))}
                             for p in pages]
    except Exception as e:
        audit['wp_pages'] = []
        audit['issues'].append('REST page listing failed: %s' % e)

    # 2. Route-by-route comparison.
    all_links = {}
    for route, rel, tpl in ROUTES:
        o_status, orig_html = get(ORIG + route)
        w_status, wp_html = get(WP + route)
        no = normalise(orig_html, False)
        nw = normalise(wp_html, True)
        to, tw = token_stream(no), token_stream(nw)
        dom_equal = to == tw
        so = canon_seo(seo(no))
        sw = canon_seo(seo(nw))
        seo_equal = so == sw
        seo_diffs = {k: (so.get(k), sw.get(k)) for k in set(so) | set(sw) if so.get(k) != sw.get(k)}

        # internal links and assets actually referenced by this page.
        # The enqueued stylesheet/script use single-quoted WP attributes and
        # were removed by normalise(); add them explicitly so they are tested.
        raw_links = sorted(set(list(links(nw)) + re.findall(r"(?:href|src)=['\"]([^'\"]*(?:style\.css|app\.js)[^'\"]*)['\"]", wp_html)))
        internal = [u for u in raw_links if classify(u) == 'internal']
        broken = []
        for u in internal:
            target = resolve(u)
            if not target:
                continue
            st = status_only(target)
            expected_404 = urllib.parse.urlparse(target).path.rstrip('/') == '/404'
            if st >= 400 and not (expected_404 and st == 404):
                broken.append({'url': u, 'status': st})
        all_links[route] = {'count': len(raw_links), 'internal': len(internal), 'external': sum(1 for u in raw_links if classify(u) == 'external'),
                            'non_http': sum(1 for u in raw_links if classify(u) == 'non-http'),
                            'broken': broken,
                            'foreign_install_urls': [u for u in raw_links if '127.0.0.1:3000' in u or 'localhost:3000' in u or '{{' in u]}

        php_errors = sorted(set(re.findall(r'(?:Fatal error|Parse error|Warning|Notice|Deprecated):[^<\n]{0,160}', wp_html)))
        mo = orig_html[orig_html.find('<main id="main">'):orig_html.find('</main>', orig_html.find('<main id="main">'))]
        mw = wp_html[wp_html.find('<main id="main">'):wp_html.find('</main>', wp_html.find('<main id="main">'))]
        def sig(m):
            return {
                'length': len(m), 'sha256': hashlib.sha256(m.encode()).hexdigest()[:16],
                'sections': len(re.findall(r'<section\b', m)),
                'details': len(re.findall(r'<details\b', m)),
                'imgs': len(re.findall(r'<img\b', m)), 'svgs': len(re.findall(r'<svg\b', m)),
                'buttons': len(re.findall(r'<button\b', m)), 'forms': len(re.findall(r'<form\b', m)),
                'ids': len(re.findall(r'\sid="', m)), 'classes': len(re.findall(r'class="', m)),
                'h1': re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', (re.findall(r'<h1[^>]*>(.*?)</h1>', m, re.S) or [''])[0])).strip(),
                'images': [os.path.basename(x) for x in re.findall(r'<img[^>]*src="([^"]+)"', m)],
                'accent_classes': sorted(set(c for cl in re.findall(r'class="([^"]+)"', m) for c in cl.split() if c.startswith('course-hero--'))),
            }
        sigo, sigw = sig(mo), sig(normalise(mw, True))
        # normalise image urls in WP main before signature (they are absolute)
        mwn = normalise(mw, True)
        sigw = sig(mwn)
        rec = {
            'route': route, 'source_file': rel, 'expected_template': tpl,
            'http': {'original': o_status, 'wordpress': w_status},
            'main_identical': mo == mwn,
            'full_dom_identical': dom_equal,
            'dom_tokens': {'original': len(to), 'wordpress': len(tw)},
            'first_dom_diff': None if dom_equal else first_diff(to, tw),
            'seo_identical': seo_equal, 'seo_diffs': {k: [str(v[0])[:220], str(v[1])[:220]] for k, v in seo_diffs.items()},
            'seo': {'canonical': sw.get('canonical'), 'robots_count': sw.get('robots'),
                    'og_tags': sum(1 for k in sw.get('meta', {}) if k.startswith('og:')),
                    'twitter_tags': sum(1 for k in sw.get('meta', {}) if k.startswith('twitter:')),
                    'jsonld_types': [j.get('@type') for j in sw.get('jsonld', []) if isinstance(j, dict)]},
            'signatures': {'original': sigo, 'wordpress': sigw, 'equal': sigo == sigw},
            'links': all_links[route],
            'php_errors_in_body': php_errors,
            'has_broken_tokens': '{{' in wp_html,
            'rtl': 'dir="rtl"' in wp_html and 'lang="fa"' in wp_html,
            'shared_chrome': {k: k in wp_html for k in ['class="header-topbar"', 'class="site-header"', 'id="mobileNav"',
                                                        'class="site-footer"', 'class="mobile-call-bar"', 'class="back-to-top"']},
        }
        audit['routes'].append(rec)
        print(f'{"OK  " if dom_equal and seo_equal and not broken and not php_errors else "DIFF"} {route:38} '
              f'status={o_status}/{w_status} dom={dom_equal} main={rec["main_identical"]} seo={seo_equal} '
              f'links={len(internal)} broken={len(broken)} php={len(php_errors)}')

    # 3. 404 template behaviour.
    s404, b404 = get(WP + '/404/')
    smiss, bmiss = get(WP + '/nonexistent-route/')
    audit['notfound'] = {
        'explicit_route_status': s404, 'missing_route_status': smiss,
        'explicit_uses_404_markup': 'class="section error-section"' in b404 and 'error-code' in b404,
        'missing_uses_404_markup': 'class="section error-section"' in bmiss and 'error-code' in bmiss,
        'wp_error404_body_class': 'error404' in re.findall(r'<body[^>]*>', bmiss)[0] if re.findall(r'<body[^>]*>', bmiss) else False,
        'original_static_soft404': get(ORIG + '/404/')[0] == 200,
        'note': 'Original static server returned the 404 page with HTTP 200 (soft 404); WordPress correctly returns HTTP 404 from 404.php.',
    }

    # 4. Token storage + forms still real.
    try:
        rest = json.loads(get(WP + '/wp-json/wp/v2/pages?per_page=100&_fields=slug,content')[1])
        audit['token_storage'] = {'pages': len(rest),
                                  'all_pages_tokenised': all(p['content']['rendered'].count('{{') > 0 for p in rest),
                                  'hardcoded_hosts': sum(len(re.findall(r'https?://', p['content']['rendered'])) for p in rest),
                                  'total_asset_tokens': sum(p['content']['rendered'].count('{{ASSET:') for p in rest),
                                  'total_link_tokens': sum(p['content']['rendered'].count('{{LINK:') for p in rest)}
    except Exception as e:
        audit['token_storage'] = {'error': str(e)}
    audit['forms'] = {}
    for path in ('/api/registrations', '/api/contact'):
        st, body = get(WP + path)
        audit['forms'][path] = {'GET_status': st, 'not_static_html': 'application/json' in body or st == 405,
                                'body_sample': body[:120]}
    for route in ('/register/', '/contact/'):
        _, h = get(WP + route)
        audit['forms'][route] = {'form_elements': len(re.findall(r'<form\b', h)),
                                 'data_form_hooks': len(re.findall(r'data-form', h)),
                                 'app_js_loaded': 'app.js' in h}

    # 5. Course individuality.
    courses = [r for r in audit['routes'] if r['route'].startswith('/courses/') and r['route'] != '/courses/']
    audit['course_individuality'] = {
        'count': len(courses),
        'distinct_main_hashes': len(set(r['signatures']['original']['sha256'] for r in courses)),
        'distinct_h1': len(set(r['signatures']['original']['h1'] for r in courses)),
        'distinct_accent_classes': [r['signatures']['original']['accent_classes'] for r in courses],
        'distinct_image_sets': len(set(tuple(r['signatures']['original']['images']) for r in courses)),
        'each_uses_own_template': all(os.path.exists(os.path.join(THEME, r['expected_template'])) for r in courses),
        'image_counts': {r['route']: r['signatures']['original']['imgs'] for r in courses},
        'faq_counts': {r['route']: r['signatures']['original']['details'] for r in courses},
    }

    audit['summary'] = {
        'routes_checked': len(audit['routes']),
        'full_dom_identical': sum(r['full_dom_identical'] for r in audit['routes']),
        'main_identical': sum(r['main_identical'] for r in audit['routes']),
        'seo_identical': sum(r['seo_identical'] for r in audit['routes']),
        'routes_with_broken_links': sum(bool(r['links']['broken']) for r in audit['routes']),
        'total_internal_links': sum(r['links']['internal'] for r in audit['routes']),
        'routes_with_php_errors': sum(bool(r['php_errors_in_body']) for r in audit['routes']),
        'routes_with_leaked_tokens': sum(r['has_broken_tokens'] for r in audit['routes']),
        'routes_rtl': sum(r['rtl'] for r in audit['routes']),
        'shared_chrome_all_routes': all(all(r['shared_chrome'].values()) for r in audit['routes']),
        'asset_sha256_mismatches': len(mismatch),
        'unexpected_theme_assets': len(extra),
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(audit, open(OUT, 'w', encoding='utf8'), ensure_ascii=False, indent=2)
    print('\nSUMMARY', json.dumps(audit['summary'], ensure_ascii=False))
    print('saved', OUT)
    return 0 if audit['summary']['full_dom_identical'] == 11 else 1


if __name__ == '__main__':
    sys.exit(main())
