# مرحلهٔ C — تکمیل تبدیل و یکپارچهسازی تمام صفحات وردپرس

تاریخ: ۲۰۲۶-۱۱-۰۸ (UTC) — شاخه: `arena/dfee8ce0-raouf`
منبع معتبر: `abc23ef6ddbd4a74111f6c0347504a35eb746002` (دست‌نخورده).
محدوده: **فقط مرحلهٔ C**؛ مراحل D و F آغاز نشده‌اند. گزارش‌های مراحل A و B حفظ و دست‌نخوردهاند.

> **نتیجهٔ کلیدی:** هیچ تغییری در کد قالب لازم نشد. تمام ۱۱ مسیر، ساختار DOM، محتوا، تصاویر، فونت‌ها، SEO، لینک‌ها، تعاملات JS و رفتار واکنش‌گرا با منبع اصلی یکساناند؛ `stage-C-*` تنها اسکریپت‌ها و مدارک QA جدیداند.

## ۱. وضعیت تکتک صفحات (مسیر‌به‌مسیر)

| مسیر | فایل منبع | الگوی وردپرس | HTTP (اصلی/WP) | DOM کامل | بصری دسکتاپ | بصری موبایل | SEO | لینک‌های داخلی | خطای PHP/کنسول | وضعیت |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | `index.html` | `front-page.php` | 200/200 | ✅ | AE=۰ | AE=۰ | ✅ | 35 / 0 شکسته | 0/0 | **COMPLETE** |
| `/courses/` | `courses/index.html` | `page-courses.php` | 200/200 | ✅ | PNG: AE=۰ | AE=۰ | ✅ | 25 / 0 شکسته | 0/0 | **COMPLETE** |
| `/courses/skin-facial/` | `courses/skin-facial/index.html` | `page-skin-facial.php` | 200/200 | ✅ | AE=۰ | AE=۰ | ✅ | 30 / 0 شکسته | 0/0 | **COMPLETE** |
| `/courses/medical-emergency/` | `courses/medical-emergency/index.html` | `page-medical-emergency.php` | 200/200 | ✅ | AE=۰ | AE=۰ | ✅ | 30 / 0 شکسته | 0/0 | **COMPLETE** |
| `/courses/pharmacy-technician/` | `courses/pharmacy-technician/index.html` | `page-pharmacy-technician.php` | 200/200 | ✅ | AE=۰ | AE=۰ | ✅ | 28 / 0 شکسته | 0/0 | **COMPLETE** |
| `/courses/massage-relaxation/` | `courses/massage-relaxation/index.html` | `page-massage-relaxation.php` | 200/200 | ✅ | AE=۰ | AE=۰ | ✅ | 30 / 0 شکسته | 0/0 | **COMPLETE** |
| `/about/` | `about/index.html` | `page-about.php` | 200/200 | ✅ | AE=۰ | AE=۰ | ✅ | 27 / 0 شکسته | 0/0 | **COMPLETE** |
| `/gallery/` | `gallery/index.html` | `page-gallery.php` | 200/200 | ✅ | AE=۰ | AE=۰ | ✅ | 69 / 0 شکسته | 0/0 | **COMPLETE** |
| `/contact/` | `contact/index.html` | `page-contact.php` | 200/200 | ✅ | AE=۰ | AE=۰ | ✅ | 15 / 0 شکسته | 0/0 | **COMPLETE** |
| `/register/` | `register/index.html` | `page-register.php` | 200/200 | ✅ | AE=۰ | AE=۰ | ✅ | 15 / 0 شکسته | 0/0 | **COMPLETE** |
| `/404/` | `404/index.html` | `404.php` | 200/404 | ✅ | AE=۰ | AE=۰ | ✅ | 16 / 0 شکسته | 0/2 (expected) | **COMPLETE** |

جزئیات هر ردیف (طول `<main>`، تعداد توکن‌های DOM، canonical/robots/OG/Twitter/JSON-LD، تصاویر، `overflowX`، RTL محاسبهشده، عناصر مشترک) در `stage-C-report.json` و `stage-C-audit.json` موجود است.

## ۲. بررسی الزامات دوازدهگانه

| # | الزام | نتیجه | مدرک |
| --- | --- | --- | --- |
| 1 | All 11 original routes implemented | **PASS** | 11/11 routes present, each mapped to its own template; 404.php handles the real 404. |
| 2 | Every page checked against original HTML source | **PASS** | Full normalised DOM token stream identical on 11/11; `<main>` byte-identical 11/11; header/main/footer identical 11/11. |
| 3 | HTML/CSS/classes/IDs/text/images/SVG/fonts/backgrounds/spacing/responsive/animation/hover/focus/JS preserved | **PASS** | 70/70 asset SHA-256 matches, JS byte-identical, CSS differs only by documented D13, 22/22 route-viewport visual comparisons identical, hover/focus states identical, all JS interactions parity-tested. |
| 4 | Shared header, footer, navigation, mobile menu, fixed contact bar on every applicable page | **PASS** | 22/22 route-viewport checks: all six chrome elements present, active-nav markers equal to source, desktop dropdown + mobile drawer + back-to-top functional, call bar hidden on desktop / grid on mobile. |
| 5 | All course pages individually verified (no generic template) | **PASS** | 4 distinct templates, 4 distinct `<main>` hashes, 4 distinct H1s, 4 distinct accent classes, 4 distinct image sets, original course-specific gradients preserved, 3 FAQ items each, Course JSON-LD each. |
| 6 | Gallery filters, lightbox, keyboard navigation, Escape | **PASS** | 6/6 filters parity (27/11/3/5/5/3 visible), lightbox parity on 6 routes including ArrowLeft/ArrowRight, next/prev buttons, Escape and close button. |
| 7 | All FAQ accordions and original behaviour | **PASS** | 5 routes with FAQ (home 5 + 4 course pages 3 each): native `name`-grouped exclusive accordion parity identical to the original. |
| 8 | SEO metadata / canonical / robots / OG / Twitter / structured data preserved | **PASS** | 11/11 SEO objects byte-identical after origin normalisation; exactly 1 canonical + 1 robots per route; 5 OG tags + 1 Twitter tag per route; EducationalOrganization + 4 Course JSON-LD valid. |
| 9 | Domain-independent token system preserved | **PASS** | 10 saved pages all tokenised (338 ASSET + 121 LINK), 0 hardcoded hosts, 0 leaked tokens in rendered HTML; 319 internal links resolve on alternate domain `http://stage-c.example`. |
| 10 | Contact and registration forms remain real | **PASS** | Both endpoints GET 405 JSON (not static HTML), both form markups + data-form hooks + app.js present, browser submissions persisted with REG-/MSG- references, client validation active. |
| 11 | 404 page is a real WordPress 404 template | **PASS** | `/404/` and `/nonexistent-route/` both return HTTP 404 with the exact original 404 markup and WP `error404` body class; original static site returned 200 (soft 404). |
| 12 | Internal links work under the installation URL, including after a domain change | **PASS** | 320 internal links checked on :9400 (0 broken); 319 checked on the alternate production-like domain (0 broken, 0 foreign install URLs); canonical/robots 1 each on both. |

### خلاصهٔ آماری

```text
{
  "routes_total": 11,
  "routes_complete": 11,
  "full_dom_identical": 11,
  "seo_identical": 11,
  "route_viewport_checks": 22,
  "visual_pairs": 22,
  "visual_pairs_strict_identical": 21,
  "visual_pairs_identical_after_lossless_confirmation": 22,
  "all_routes_visually_identical": true,
  "interaction_checks": 28,
  "interaction_failures": 0,
  "behaviour_parity_checks": 12,
  "behaviour_parity_identical": 12,
  "internal_links_main_install": 320,
  "internal_links_alternate_domain": 319,
  "broken_links": 0,
  "php_errors": 0,
  "asset_sha256_mismatches": 0,
  "unexpected_theme_assets": 0,
  "console_errors_expected_404": 2,
  "console_errors_unexpected": 0,
  "issues_found": 7,
  "theme_changes_required": 0,
  "stage_D_started": false,
  "stage_F_started": false
}
```

## ۳. مسائل کشفشده و نحوهٔ برخورد با آنها

### C01 — `/courses/` desktop JPEG pair AE=612

- **یافته:** One of 22 screenshot pairs showed 612 differing pixels (RMSE 5.93e-05). All were inside a 608x32 photographic band, maximum channel delta 8/255.
- **تشخیص:** JPEG encoder quantisation noise, not a content/design difference. A lossless PNG re-capture of the same pair is byte-size-identical and AE=0 / RMSE=0.
- **اقدام:** Documented; lossless confirmation added to qa/stage-C-visual-compare.py and stage-C-visual.json. No theme change.
- **دسته:** Not a defect (measurement artefact) — نیاز به تغییر قالب: `خیر`

### C02 — `/404/` HTTP status differs (original 200, WordPress 404)

- **یافته:** The static server served the 404 page with HTTP 200 (soft 404); WordPress returns HTTP 404 from 404.php.
- **تشخیص:** Required by the Stage C mandate "404 page works as a real WordPress 404 template". HTML is byte-identical.
- **اقدام:** Documented as an intentional, correct improvement; canonical remains `/404/`. No theme change.
- **دسته:** Intentional correct difference — نیاز به تغییر قالب: `خیر`

### C03 — Two browser console errors / two failed requests

- **یافته:** Both occur only on the two `/404/` captures and read "Failed to load resource: 404" / "HTTP 404 .../404/".
- **تشخیص:** These are the expected HTTP status of the 404 page itself, not a broken asset or JS error. All other 20 captures are clean.
- **اقدام:** Classified as expected in the report; no theme change.
- **دسته:** Expected behaviour — نیاز به تغییر قالب: `خیر`

### C04 — Raw `qa/compare.py` header/footer flags reported False

- **یافته:** The raw structural script compares header/footer fragments including WP body classes and enqueued tags, so it reports False on all 11 routes.
- **تشخیص:** QA-script artefact. The normalised `dom-compare.py` and the new full-DOM token audit both report 11/11 identical.
- **اقدام:** `qa/compare.py` extended with STRUCTURAL_REPORT env so Stage A/B evidence is preserved; Stage C results saved separately. No theme change.
- **دسته:** QA tooling fix — نیاز به تغییر قالب: `خیر`

### C05 — Back-to-top button absent on desktop `/404/`

- **یافته:** The 404 page is shorter than the viewport, so `window.scrollY > 480` (original JS threshold) never becomes true.
- **تشخیص:** Identical to the original static site behaviour; no JS/CSS change.
- **اقدام:** QA assertion corrected to derive the expected state from maxScroll > 480. No theme change.
- **دسته:** QA assertion fix — نیاز به تغییر قالب: `خیر`

### C06 — 1e-5 floating-point difference in hover transform

- **یافته:** Computed hover transform was -2.9988 on the original and -2.99881 on WordPress.
- **تشخیص:** Floating-point rounding in Chromium; background colour and focus outline are identical.
- **اقدام:** QA comparison now rounds transform values to 2 decimals. No theme change.
- **دسته:** QA tolerance fix — نیاز به تغییر قالب: `خیر`

### C07 — Root-relative source URLs become absolute in WordPress

- **یافته:** Original `href="/courses/"` / `og:image="/assets/..."`; WordPress emits `home_url()` / `get_template_directory_uri()`.
- **تشخیص:** Documented Stage B deviation D12, required for a domain-independent, subdirectory-safe install. Verified on a production-like alternate domain with 319 links and zero foreign URLs.
- **اقدام:** No new deviation; re-verified in Stage C. No theme change.
- **دسته:** Previously documented accepted deviation — نیاز به تغییر قالب: `خیر`

هیچ نقص محتوایی، بصری، امنیتی یا عملکردی در قالب یافت نشد؛ بنابراین **۰ تغییر کد قالب** در مرحلهٔ C انجام شد. مقایسهٔ بایتبهبایت فایل‌های قالب با ZIP مرحلهٔ B نیز این را تأیید می‌کند (تنها تفاوت، فایل مرجع `style.css.source.css` است که عمداً از بستهٔ نصبی حذف می‌شود، D13).

## ۴. آزمایشهای اجراشده (واقعی، نه شبیهسازی)

| دسته | تعداد | نتیجه | فایل مدرک |
| --- | --- | --- | --- |
| مقایسهٔ DOM کامل (تگ/صفت/کلاس/ID/متن/SVG) | ۱۱ مسیر | ۱۱/۱۱ یکسان | `stage-C-audit.json` |
| مقایسهٔ ساختاری `<main>` + ترتیب کلاس‌ها | ۱۱ مسیر | ۱۱/۱۱ یکسان | `stage-C-structural.json` |
| مقایسهٔ هدر/محتوا/فوتی نرمالشده | ۱۱ مسیر | ۱۱/۱۱ یکسان | `stage-C-dom.json` |
| عکسبرداری تمامصفحهٔ Chromium | ۱۱ مسیر × ۲ اندازه = ۲۲ جفت | ۲۱ AE=۰ + ۱ تأیید PNG بی‌درنگ | `stage-C-visual.json` |
| بررسی هدر/فوتی/منو/نوار تماس/RTL/واکنش‌گرایی + hover/focus + فرم‌ها | ۲۸ چک | ۰ شکست | `stage-C-interactions.json` |
| هم‌ارزی فیلتر گالری/لایتباکس/کلید‌ها/Escape/FAQ | ۱۲ چک، ۱۲ دنباله | ۱۲/۱۲ یکسان | `stage-C-behaviour.json` |
| لینک‌های داخلی روی دامنهٔ نصب اصلی | ۳۲۰ لینک | ۰ شکسته | `stage-C-audit.json` |
| لینک‌های داخلی روی دامنهٔ متفاوت `http://stage-c.example` | ۳۱۹ لینک | ۰ شکسته، ۰ نشانی بیگانه | `stage-C-domain.json` |
| برابری SHA-256 دارایی‌ها (۶۷ تصویر + ۳ فونت) | ۷۰ فایل | ۰ ناهماهنگی، ۰ فایل اضافه | `stage-C-audit.json` |
| خطا‌های PHP در بدنهٔ پاسخ | ۱۱ مسیر | ۰ | `stage-C-audit.json` |
| خطا‌های کنسول مرورگر | ۲۲ نوبت بارگذاری | ۲ مورد **منتظره** (خود صفحهٔ ۴۰۴)، ۰ مورد غیرمنتظره | `stage-C-visual.json` |

**توضیح شفافیت دربارهٔ «همهٔ ۱۱ صفحه از نظر بصری مقایسه شدند»:** بله، هر ۱۱ مسیر در دو اندازهٔ دسکتاپ (۱۳۶۶×۷۶۸) و موبایل (۳۹۰×۸۴۴) عکسبرداری و پیکسل‌به‌پیکسل مقایسه شدند. ۲۱ جفت `AE=0` بودند؛ جفت `/courses/` دسکتاپ بهدلیل نویز کدگذاری JPEG تفاوت ۶۱۲ پیکسلی با حداکثر اختلاف ۸/۲۵۵ داشت که با عکسبرداری بی‌درنگ PNG دقیقاً `AE=0` شد. بنابراین ادعای «۱۱/۱۱ یکسان» بر پایهٔ مقایسهٔ واقعی و تأیید بی‌درنگ است، نه حدس.

## ۵. فایل‌های مرحلهٔ C

- اسکریپت‌های جدید: `qa/stage-C-audit.py`, `qa/stage-C-visual.mjs`, `qa/stage-C-visual-compare.py`, `qa/stage-C-interactions.mjs`, `qa/stage-C-gallery-faq.mjs`, `qa/stage-C-domain.py`, `qa/stage-C-report.py`.
- ویرایش جزئی: `qa/compare.py` (پشتیبانی از `STRUCTURAL_REPORT` برای حفظ مدارک A/B) و `SOURCE-README.md` (فهرست اسکریپت‌های C).
- نتایج: `qa/results/stage-C-*.json` و این گزارش.
- فایل‌های قالب: **بدون تغییر**؛ `dist/raouf-academy-wordpress-theme.zip` دقیقاً همان ۱۰۳ ورودی / ۵٬۳۸۲٬۵۹۱ بایت مرحلهٔ B است.
- `dist/source-code.zip` بازسازی شد: **۱۴۴ ورودی**، `testzip()=OK`، ۰ نام تکراری، شامل ۷ اسکریپت و ۹ نتیجهٔ مرحلهٔ C در کنار تمام مدارک A/B؛ بدون کش یا فایل موقت.

## ۶. موارد `NOT TESTED` (خارج از محدودهٔ مرحلهٔ C)

- Full Stage F QA: 6-viewport / 60-pair visual suite, 28 browser interactions, full form/rate-limit suite, final ZIP upload/activation from wp-admin.
- Stage D, E, G and final acceptance; no completion claim is made.
- Real LAMP/LEMP with MySQL/MariaDB, real SMTP, multisite, WP 6.4-6.7 / >6.8.3, PHP 7.4, Theme Check / PHPCS-WPCS.
- Physical devices, legacy browsers, third-party plugins/builders, WooCommerce, LMS, PageSpeed/CDN/load tests.
- PDF rendering in an external viewer, and users with assistive technology / screen readers.
- Visual comparison at 1920x1080, 1024x768, 768x1024 and 360x800 (covered historically by Stage F 60/60, not re-run in Stage C).

همچنین همانند مرحلهٔ B، دو رکورد آزمایشی دیگر (REG/MSG) در پایگاهدادهٔ دورریختنی Playground `:9400` ایجاد شد تا مسیر واقعی فرم‌ها بررسی شود؛ این داده‌ها در هیچ بستهٔ تحویلی وجود ندارند. نمونهٔ دامنهٔ جایگزین `:9403` صرفاً برای تست لینک‌ها ساخته شد.

## ۷. حفظ مدارک مراحل قبل

گزارش‌های `stage-A-audit.md/.json` و `stage-B-report.md/.json` و همچنین `structural.json` و `visual-report.json` بدون تغییر باقی ماندند و هش آنها پیش/پس از مرحلهٔ C یکسان است. منبع اصلی، ZIPهای تریکشده و کامیت معتبر نیز تغییر نکردند.
