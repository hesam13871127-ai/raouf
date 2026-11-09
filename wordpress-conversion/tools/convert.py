#!/usr/bin/env python3
"""
Exact HTML -> WordPress theme converter for Raouf Academy.

It does NOT redesign anything. It mechanically splits each original HTML
document into header / main / footer, replaces only installation-specific
URLs with tokens, and emits PHP templates that print the original markup
verbatim. Original CSS/JS/images/icons are copied byte-for-byte.
"""
import os, re, json, html as html_mod

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, '.work', 'wp-source', 'raouf-academy', 'public')
THEME = os.path.join(ROOT, 'wordpress-conversion', 'theme', 'raouf-academy')
INC = os.path.join(THEME, 'inc')

SITE_NAME = 'آموزشگاه فنی و حرفه\u200cای رئوف'
ADDRESS = 'تبریز، بارون آواک، روبروی مسجد ملاعلی\u200cاکبر، ساختمان بهنام، طبقه سوم'
OSM = 'https://www.openstreetmap.org/search?query=' + __import__('urllib.parse', fromlist=['quote']).quote(ADDRESS)
INSTA_URL = 'https://www.instagram.com/academi_raouf/'
PHONE_DISPLAY = '+98 9141 803287'
PHONE_TEL = '+989141803287'
FOOTER_INTRO = 'آموزشگاه فنی و حرفه\u200cای رئوف، فضایی برای یادگیری مهارت\u200cهای تخصصی و کاربردی در حوزه\u200cهای زیبایی، پزشکی، داروخانه و ماساژ با رویکرد آموزش عملی.'

ROUTES = [
    ('/', 'home', ''),
    ('/courses/', 'courses', ''),
    ('/courses/skin-facial/', 'skin-facial', 'courses'),
    ('/courses/medical-emergency/', 'medical-emergency', 'courses'),
    ('/courses/pharmacy-technician/', 'pharmacy-technician', 'courses'),
    ('/courses/massage-relaxation/', 'massage-relaxation', 'courses'),
    ('/about/', 'about', ''),
    ('/gallery/', 'gallery', ''),
    ('/contact/', 'contact', ''),
    ('/register/', 'register', ''),
    ('/404/', 'notfound', ''),
]

TEMPLATES = {
    'home': 'front-page.php',
    'courses': 'page-courses.php',
    'skin-facial': 'page-skin-facial.php',
    'medical-emergency': 'page-medical-emergency.php',
    'pharmacy-technician': 'page-pharmacy-technician.php',
    'massage-relaxation': 'page-massage-relaxation.php',
    'about': 'page-about.php',
    'gallery': 'page-gallery.php',
    'contact': 'page-contact.php',
    'register': 'page-register.php',
}


def read(route):
    p = os.path.join(SRC, route.strip('/'), 'index.html') if route != '/' else os.path.join(SRC, 'index.html')
    return open(p, encoding='utf-8').read()


def tokenize(s):
    """Only installation-specific values become tokens; all markup is untouched."""
    s = re.sub(r'/assets/([A-Za-z0-9._\-/]+)', r'{{ASSET:\1}}', s)
    s = re.sub(r'href="/([^"]*)"', lambda m: 'href="{{LINK:/' + m.group(1) + '}}"', s)
    s = s.replace('http://localhost:3000', '{{HOME}}')
    s = s.replace('href="tel:' + PHONE_TEL + '"', 'href="tel:{{PHONE_TEL}}"')
    s = s.replace(PHONE_TEL, '{{PHONE_TEL}}')
    s = s.replace(PHONE_DISPLAY, '{{PHONE_DISPLAY}}')
    s = s.replace(OSM, '{{MAP_URL}}')
    s = s.replace(INSTA_URL, '{{INSTA_URL}}')
    s = s.replace(ADDRESS, '{{ADDRESS}}')
    s = s.replace('academi_raouf', '{{INSTA_USER}}')
    s = s.replace(FOOTER_INTRO, '{{FOOTER_INTRO}}')
    s = s.replace(SITE_NAME, '{{SITE_NAME}}')
    s = s.replace('© 2026', '© {{YEAR}}')
    return s


_nowdoc_counter = [0]


def php_nowdoc(var, text):
    """PHP nowdoc assigned to a variable (closing marker + ';'), then echoed."""
    _nowdoc_counter[0] += 1
    n = _nowdoc_counter[0]
    return ("$raouf_html_" + str(n) + " = <<<'" + var + "'\n" + text + "\n" + var + ";\n"
            "echo raouf_expand_tokens( $raouf_html_" + str(n) + " );\n")


def php_fragmented(text, label):
    """Emit exact HTML nowdocs with injected <?php ... ?> calls between them."""
    chunks = re.split(r'(<\?php.*?\?>)', text, flags=re.S)
    out = ''
    for i, chunk in enumerate(chunks):
        if not chunk:
            continue
        if chunk.startswith('<?php'):
            out += chunk[len('<?php'):-2].strip() + "\n"
        else:
            out += php_nowdoc(label + '_' + str(i), chunk)
    return out


def meta_of(doc, route, key):
    def m(pattern, default=''):
        x = re.search(pattern, doc, re.S)
        return x.group(1) if x else default
    title = html_mod.unescape(m(r'<title>(.*?)</title>'))
    desc = html_mod.unescape(m(r'<meta name="description" content="(.*?)">'))
    canonical = m(r'<link rel="canonical" href="([^"]*)"')
    og_image = m(r'<meta property="og:image" content="([^"]*)"')
    og_url = m(r'<meta property="og:url" content="([^"]*)"')
    body = re.search(r'<body data-page="([^"]*)" class="([^"]*)"', doc)
    page_key, body_class = (body.group(1), body.group(2)) if body else (key, '')
    ld = re.search(r'<script type="application/ld\+json">(.*?)</script>', doc, re.S)
    jsonld = tokenize(ld.group(1)) if ld else ''
    return {
        'route': route,
        'slug': key,
        'title': title,
        'description': desc,
        'canonical': canonical,
        'og_image': og_image.lstrip('/'),
        'og_url': og_url,
        'page_key': page_key,
        'body_class': body_class,
        'jsonld': jsonld,
        'lightbox': 'class="lightbox"' in doc,
    }


def split_doc(doc):
    body_open = doc[doc.find('<body'):doc.find('>', doc.find('<body')) + 1]
    head = doc[doc.find('<head>') + 6:doc.find('</head>')]
    after_body = doc[doc.find('>', doc.find('<body')) + 1:]
    main_at = after_body.find('<main id="main">')
    header_part = after_body[:main_at]
    rest = after_body[main_at + len('<main id="main">'):]
    main_end = rest.find('</main>')
    main_content = rest[:main_end]
    footer_part = rest[main_end + len('</main>'):]
    script_at = footer_part.find('<script src="/assets/js/app.js" defer></script>')
    if script_at >= 0:
        footer_part = footer_part[:script_at] + footer_part[script_at + len('<script src="/assets/js/app.js" defer></script>'):]
    return head, body_open, header_part, main_content, footer_part


def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w', encoding='utf-8').write(content)
    print('  wrote', os.path.relpath(path, ROOT), len(content), 'bytes')


def main():
    docs = {}
    for route, key, parent in ROUTES:
        docs[key] = read(route)

    # ---- shared header/footer fragments come from the homepage ----
    head, body_open, header_part, home_main, footer_part = split_doc(docs['home'])

    nav_start = header_part.find('<nav class="desktop-nav"')
    nav_end = header_part.find('</nav>', nav_start) + len('</nav>')
    header_a = header_part[:nav_start]
    header_nav = header_part[nav_start:nav_end]
    header_b = header_part[nav_end:]

    # footer quick-links / courses lists become real WordPress menus
    f = footer_part
    m1 = re.search(r'(<h3>ناوبری سریع</h3>\s*)<ul>.*?</ul>', f, re.S)
    m2 = re.search(r'(<h3>دوره\u200cهای آموزشی</h3>\s*)<ul>.*?</ul>', f, re.S)
    if not m2:
        m2 = re.search(r'(<h3>دوره‌های آموزشی</h3>\s*)<ul>.*?</ul>', f, re.S)
    footer_quick_fallback = re.search(r'<ul>.*?</ul>', m1.group(0), re.S).group(0)
    footer_courses_fallback = re.search(r'<ul>.*?</ul>', m2.group(0), re.S).group(0)
    footer_a = f[:m1.start()] + m1.group(1) + '<?php raouf_footer_menu(); ?>' + f[m1.end():m2.start()] + m2.group(1) + '<?php raouf_courses_menu(); ?>' + f[m2.end():]

    # mobile navigation becomes a real WordPress menu with an exact fallback
    mob = re.search(r'(<div class="mobile-nav-inner">)([\s\S]*?)(\n        </div>\n      </div>\n    </header>)', header_b)
    mobile_fallback = mob.group(2) if mob else ''
    if mob:
        header_b = header_b[:mob.start(2)] + '<?php raouf_mobile_menu(); ?>' + header_b[mob.end(2):]

    lightbox = re.search(r'<dialog class="lightbox".*?</dialog>', footer_part, re.S)
    lightbox_html = lightbox.group(0) if lightbox else ''
    footer_a = footer_a.replace(lightbox_html, '<?php if ( raouf_meta( \'lightbox\' ) ) { raouf_lightbox_markup(); } ?>') if lightbox_html else footer_a
    # the closing document tags are emitted by footer.php after wp_footer()
    footer_a = re.sub(r'</body>\s*</html>\s*$', '', footer_a)

    # ---------------------------- style.css ----------------------------
    css = open(os.path.join(SRC, 'assets', 'css', 'style.css'), encoding='utf-8').read()
    # style.css lives at theme root; make font URLs relative to it. Nothing else changes.
    css_out = css.replace('/assets/fonts/', 'assets/fonts/')
    header_comment = """/*
Theme Name: Raouf Academy
Theme URI: https://github.com/hesam13871127-ai/raouf
Author: Raouf Academy
Author URI: https://www.instagram.com/academi_raouf/
Description: تبدیل دقیق وب\u200cسایت آموزشگاه فنی و حرفه\u200cای رئوف به قالب وردپرس (فارسی، RTL، بدون تغییر بصری).
Version: 1.0.0
Requires at least: 6.4
Tested up to: 6.8
Requires PHP: 8.0
License: GNU General Public License v2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html
Text Domain: raouf-academy
Tags: rtl-language-support, education, custom-menu, translation-ready
*/
"""
    write(os.path.join(THEME, 'style.css'), header_comment + css_out)

    # ---------------------------- header.php ----------------------------
    header_php = """<?php
/**
 * Original document head + site header, preserved exactly.
 * @package Raouf_Academy
 */
defined( 'ABSPATH' ) || exit;
$m = raouf_meta_all();
?><!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title><?php echo esc_html( $m['title'] ); ?></title>
<meta name="description" content="<?php echo esc_attr( $m['description'] ); ?>">
<meta name="theme-color" content="#303D62">
<meta name="robots" content="index, follow">
<meta name="author" content="<?php echo esc_attr( raouf_option( 'site_name' ) ); ?>">
<link rel="canonical" href="<?php echo esc_attr( $m['canonical'] ); ?>">
<meta property="og:type" content="website">
<meta property="og:site_name" content="<?php echo esc_attr( raouf_option( 'site_name' ) ); ?>">
<meta property="og:title" content="<?php echo esc_attr( $m['title'] ); ?>">
<meta property="og:description" content="<?php echo esc_attr( $m['description'] ); ?>">
<meta property="og:image" content="<?php echo esc_url( raouf_asset_url( $m['og_image'] ) ); ?>">
<?php if ( ! empty( $m['og_url'] ) ) : ?>
<meta property="og:url" content="<?php echo esc_url( $m['og_url'] ); ?>">
<?php endif; ?>
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="<?php echo esc_url( raouf_asset_url( 'assets/images/raouf-logo.jpg' ) ); ?>" type="image/jpeg">
<link rel="preload" href="<?php echo esc_url( raouf_asset_url( 'assets/fonts/vazirmatn-arabic-wght-normal.woff2' ) ); ?>" as="font" type="font/woff2" crossorigin>
<?php wp_head(); ?>
<?php if ( ! empty( $m['jsonld'] ) ) : ?>
<script type="application/ld+json"><?php echo raouf_expand_tokens( $m['jsonld'] ); // phpcs:ignore WordPress.Security.EscapeOutput ?></script>
<?php endif; ?>
</head>
<body <?php body_class( $m['body_class'] ); ?> data-page="<?php echo esc_attr( $m['page_key'] ); ?>">
<?php
""" + php_nowdoc('RAOUF_HEADER_A', tokenize(header_a)) + "raouf_primary_menu();\n" + php_fragmented(tokenize(header_b), 'RAOUF_HEADER_B') + """
echo '<main id="main">';
"""
    write(os.path.join(THEME, 'header.php'), header_php)

    # ---------------------------- footer.php ----------------------------
    footer_php = """<?php
/**
 * Original footer, sticky mobile bar, back-to-top and lightbox.
 * @package Raouf_Academy
 */
defined( 'ABSPATH' ) || exit;
echo '</main>';
""" + php_fragmented(tokenize(footer_a), 'RAOUF_FOOTER') + """wp_footer();
?>
</body>
</html>
"""
    write(os.path.join(THEME, 'footer.php'), footer_php)

    # --------------- lightbox fallback markup (exact) ---------------
    write(os.path.join(INC, 'lightbox-markup.php'),
          "<?php\n/** Exact original lightbox dialog. */\ndefined( 'ABSPATH' ) || exit;\nfunction raouf_lightbox_markup() {\n" +
          php_nowdoc('RAOUF_LIGHTBOX', tokenize(lightbox_html)) + "}\n")

    # --------------- exact fallback markup for every menu ---------------
    fb = ("<?php\n/** Exact original menu markup, used when no WP menu is assigned. */\n"
          "defined( 'ABSPATH' ) || exit;\n"
          "function raouf_nav_fallback( $which ) {\n\tswitch ( $which ) {\n")
    for label, markup in [
        ('primary', header_nav),
        ('mobile', mobile_fallback),
        ('footer', footer_quick_fallback),
        ('courses', footer_courses_fallback),
    ]:
        fb += "\t\tcase '" + label + "':\n" + php_nowdoc('RAOUF_FB_' + label.upper(), tokenize(markup)) + "\t\t\tbreak;\n"
    fb += "\t}\n}\n"
    write(os.path.join(INC, 'nav-fallback.php'), fb)

    # ---------------------------- page data ----------------------------
    pages = []
    for route, key, parent in ROUTES:
        if key == 'notfound':
            continue
        doc = docs[key]
        _, _, _, main_content, _ = split_doc(doc)
        meta = meta_of(doc, route, key)
        pages.append({
            'slug': key,
            'parent': parent,
            'wp_title': re.search(r'<h1[^>]*>(.*?)</h1>', doc, re.S).group(1) if re.search(r'<h1[^>]*>(.*?)</h1>', doc, re.S) else meta['title'],
            'template': TEMPLATES[key],
            'meta': meta,
            'content': tokenize(main_content),
        })
    # strip tags from wp_title
    for p in pages:
        p['wp_title'] = html_mod.unescape(re.sub(r'<[^>]+>', '', p['wp_title'])).strip()

    php_pages = "<?php\n/** Generated page definitions: exact original main markup with URL tokens. */\n"
    php_pages += "defined( 'ABSPATH' ) || exit;\nfunction raouf_source_pages() {\n"
    for idx, p in enumerate(pages):
        php_pages += "\t$raouf_content_" + str(idx) + " = <<<'RAOUF_CONTENT_" + str(idx) + "'\n" + p['content'] + "\nRAOUF_CONTENT_" + str(idx) + ";\n"
    php_pages += "\treturn array(\n"
    for idx, p in enumerate(pages):
        php_pages += "\t\tarray(\n"
        php_pages += "\t\t\t'slug'     => '" + p['slug'] + "',\n"
        php_pages += "\t\t\t'parent'   => '" + p['parent'] + "',\n"
        php_pages += "\t\t\t'title'    => '" + p['wp_title'].replace('\\', '\\\\').replace("'", "\\'") + "',\n"
        php_pages += "\t\t\t'template' => '" + p['template'] + "',\n"
        php_pages += "\t\t\t'meta'     => " + php_array(p['meta']) + ",\n"
        php_pages += "\t\t\t'content'  => $raouf_content_" + str(idx) + ",\n"
        php_pages += "\t\t),\n"
    php_pages += "\t);\n}\n"
    write(os.path.join(INC, 'pages-data.php'), php_pages)

    # 404 page markup
    _, _, _, nf_main, _ = split_doc(docs['notfound'])
    write(os.path.join(INC, '404-markup.php'),
          "<?php\n/** Exact original 404 main content. */\ndefined( 'ABSPATH' ) || exit;\nfunction raouf_404_markup() {\n" +
          php_nowdoc('RAOUF_404', tokenize(nf_main)) + "}\n")

    # ---------------------------- templates ----------------------------
    tpl = """<?php
/** %(doc)s @package Raouf_Academy */
defined( 'ABSPATH' ) || exit;
raouf_prepare_meta_for_current_page();
get_header();
if ( have_posts() ) {
\twhile ( have_posts() ) {
\t\tthe_post();
\t\techo raouf_expand_tokens( get_post()->post_content ); // phpcs:ignore WordPress.Security.EscapeOutput
\t}
}
get_footer();
"""
    for key, filename in TEMPLATES.items():
        write(os.path.join(THEME, filename), tpl % {'doc': 'Template for /' + ('' if key == 'home' else key) + '/'})

    write(os.path.join(THEME, 'page.php'), tpl % {'doc': 'Default page template.'})
    write(os.path.join(THEME, 'index.php'), tpl % {'doc': 'Required fallback template.'})
    write(os.path.join(THEME, 'single.php'), tpl % {'doc': 'Single post fallback.'})
    write(os.path.join(THEME, 'archive.php'), tpl % {'doc': 'Archive fallback.'})
    write(os.path.join(THEME, '404.php'), """<?php
/** Exact original 404 page. @package Raouf_Academy */
defined( 'ABSPATH' ) || exit;
raouf_set_meta( array(
\t'title'       => 'صفحه پیدا نشد | ' . raouf_option( 'site_name' ),
\t'description' => 'صفحه مورد نظر پیدا نشد.',
\t'canonical'   => raouf_current_path(),
\t'og_image'    => 'assets/images/hero-academy.webp',
\t'og_url'      => '',
\t'page_key'    => 'notfound',
\t'body_class'  => 'page-404',
\t'jsonld'      => '',
\t'lightbox'    => false,
) );
get_header();
raouf_404_markup();
get_footer();
""")
    print('\nConversion complete: %d source pages mapped.' % len(pages))


def php_array(d):
    parts = []
    for k, v in d.items():
        if isinstance(v, bool):
            val = 'true' if v else 'false'
        else:
            val = "'" + str(v).replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n') + "'"
        parts.append("\t\t\t\t'" + k + "' => " + val)
    return "array(\n" + ",\n".join(parts) + "\n\t\t\t)"


if __name__ == '__main__':
    main()
