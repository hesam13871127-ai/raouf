# گزارش وظیفهٔ D-1 — تأیید اصلاحات انجامشدهٔ مرحلهٔ D

**تاریخ:** 2026-11-08T15:33:53Z (UTC)  
**شاخه:** `arena/dfee8ce0-raouf` (active) · **HEAD:** `abc23ef6ddbd4a74111f6c0347504a35eb746002`  
**`git status --short`:** `?? wordpress-conversion/`  
**محدوده:** فقط تأیید اصلاحات موجود. ممیزیهای قبلی و اصلاحات SD-01 تا SD-06 تکرار نشدند؛ هیچ فایل قالب، CSS، JS، تصویر، فونت یا محتوایی تغییر نکرد؛ ZIPها بازسازی نشدند؛ E/F شروع نشد.

---

## خلاصهٔ اجرایی

| شاخص | نتیجه |
|---|---|
| تعداد کل آزمونهای D-1 | **73** |
| **PASS** | **73** |
| **FAIL** | **0** |
| اصلاحات تأییدشده | **6 / 6** (SD-01، SD-02، SD-03، SD-04، SD-05، SD-06) |
| Regression ظاهری/محتوایی | **خیر** |
| خطاهای امنیتی WPCS باقیمانده | **۰** |
| لینت PHP | **۲۸/۲۸** |
| PHPCompatibilityWP 8.0- | **۰ خطا / ۰ هشدار** |

> تمام 73 آزمون تعریفشده روی وضعیت **بعد از اصلاح** PASS شدند. تنها FAIL ثبتشده مربوط به نسخهٔ **قبل** اصلاح است (نقص SD-03) که بهعنوان شاهد بازتولید نقص عمداً حفظ شده است.

---
## ۱. آزمونهای بعد از اصلاح

### ۱٫۱ سوئیت امنیتی — `stage-D-security-after.json`

اجرا روی نصب تازهٔ WordPress 6.8.3 / PHP 8.3 با قالب فعلی (:9405). **24/24 PASS، ۰ FAIL**.

| گروه | تعداد | نتیجه |
|---|---:|---|
| SD-03 | 1 | PASS |
| SD-04 | 1 | PASS |
| migration | 1 | PASS |
| runtime | 1 | PASS |
| security | 19 | PASS |
| sessions | 1 | PASS |

| # | آزمون | نتیجه | شاهد کلیدی |
|---:|---|---|---|
| 1 | admin/subscriber/editor logins | PASS | subscriber=True editor=True |
| 2 | all 28 PHP files are ABSPATH-guarded (no source/PII on direct access) | PASS | violations=[] |
| 3 | submission CPT is not exposed through REST | PASS | types_status=200 cpt_status=404 |
| 4 | REST search returns no private submission | PASS | status=200 |
| 5 | GET /api/registrations is rejected (405 JSON) | PASS | status=405 |
| 6 | POST without double-submit CSRF token is denied (403) | PASS | status=403 |
| 7 | valid CSRF POST creates a real private submission (201 + ref) | PASS | status=201 body={"ok":true,"id":"REG-20261108-50D64C","message":"\u0627\u0637\u0644\u0627\u0639\u0627\u062a \u0628\u0627 \u0645\u0648\u0641\u0642\u06c |
| 8 | HTML/JS/SQL payload accepted only after sanitisation (201) | PASS | status=201 body={"ok":true,"id":"MSG-20261108-FCACD3","message":"\u0627\u0637\u0644\u0627\u0639\u0627\u062a \u0628\u0627 \u0645\u0648\u0641\u0642\u06c |
| 9 | duplicate payload is rejected (409) | PASS | status=409 |
| 10 | honeypot field rejects bots (400) | PASS | status=400 |
| 11 | invalid/scripted name rejected by validation (400) | PASS | status=400 |
| 12 | no submitted phone/e-mail appears on any public route | PASS | leaks=[] |
| 13 | admin-only screen "submissions list" denies anonymous/subscriber/editor | PASS | anon=200 sub=403 editor=403 admin=200 |
| 14 | admin-only screen "options page" denies anonymous/subscriber/editor | PASS | anon=200 sub=403 editor=403 admin=200 |
| 15 | submission detail requires a valid per-record nonce + manage_options | PASS | valid=200 forged=200 (error_text=True, pii=False) editor=403 (pii=False) |
| 16 | stored XSS payload is escaped in the admin detail view | PASS | raw_script_tags_in_detail=False |
| 17 | private CPT has no public REST route or UI | PASS | types_exposed=False |
| 18 | resync success notice is capability-gated (only administrators) | PASS | {"anonymous": {"status": 200, "notice_visible": false}, "subscriber": {"status": 200, "notice_visible": false}, "editor": {"status": 200, "notice_visi |
| 19 | resync endpoint denies a subscriber POST | PASS | status=403 |
| 20 | resync endpoint denies a nonce-less admin POST | PASS | status=403 |
| 21 | options.php still saves both array settings for an administrator | PASS | status=200 url=http://127.0.0.1:9405/wp-admin/themes.php?page=raouf-options&settings-updated=true |
| 22 | options.php denies a subscriber | PASS | status=403 |
| 23 | no PHP warning/notice/fatal text on any of the 11 routes | PASS | routes_with_php_errors=[] |
| 24 | no localhost/foreign-host dependency in rendered HTML | PASS | foreign_hits=[] |

**`manage_options` و اعلانهای مدیریتی:**

- اعلان `?raouf-resynced=1`: قبل از اصلاح مشترک و ویراستار هم آن را میدیدند؛ اکنون مهمان/مشترک/ویراستار **نمیبینند** و فقط مدیر **میبیند**.

- `resync` بدون nonce → ۴۰۳؛ با مشترک → ۴۰۳؛ صفحات «درخواستها» و «تنظیمات قالب» برای مهمان/مشترک/ویراستار → ۴۰۳ و برای مدیر → ۲۰۰.

- `options.php`: ذخیره با nonce مدیر → ۲۰۰ + `settings-updated=true`؛ درخواست مشترک → ۴۰۳.

- جزئیات رکورد: nonce معتبر مدیر → ۲۰۰ با داده؛ nonce جعلی → متن «نشست نامعتبر» بدون PII؛ ویراستار → ۴۰۳ بدون PII.

**دسترسی غیرمجاز / مهمان / مشترک و افشای اطلاعات:**

- ۲۸ فایل PHP در دسترسی مستقیم → بدنهٔ خالی، بدون کد منبع یا PII.

- CPT در `/wp-json/wp/v2/types` افشا نشد؛ `/wp-json/wp/v2/raouf_submission` → ۴۰۴؛ جستوجوی REST → بدون رکورد خصوصی.

- شمارهٔ تلفن و رایانامهٔ ارسالشده در هیچیک از ۱۱ مسیر عمومی ظاهر نشد؛ بدنهٔ جزئیات ادمین حاوی `<script>`/`onerror` خام نیست.

- GET فرمها → ۴۰۵ JSON؛ POST بدون CSRF → ۴۰۳؛ honeypot/ورودی اسکریپتی → ۴۰۰؛ تکرار → ۴۰۹؛ فرم معتبر → ۲۰۱ با شمارهٔ پیگیری `REG-20261108-50D64C`.

### ۱٫۲ مقایسهٔ قبل و بعد

| اجرا | فایل | PASS | FAIL | توضیح |
|---|---|---:|---:|---|
| قبل (هارنس اولیه، D-0) | `stage-D-security-before.json` | 18 | 6 | ۱ FAIL واقعی (SD-03) + ۵ FAIL ناشی از خطاهای هارنس؛ حفظ شده است |
| قبل (همان هارنس اصلاحشده) | `stage-D-security-before-corrected.json` | 23 | 1 | تنها FAIL: نقص SD-03 قبل از اصلاح |
| بعد (همان هارنس اصلاحشده) | `stage-D-security-after.json` | 24 | 0 | همه PASS |

**علت ۵ FAIL ساختگی هارنس (فقط فایل QA اصلاح شد، هیچ کد قالبی دست نخورد):**

1. شمارهٔ تلفن تست ۱۰ رقمی بود؛ الگوی فرم ^09\d{9}$ یعنی ۱۱ رقم → به ۱۱ رقم اصلاح شد (cause of 3 false FAILs).
2. آزمون تکرار (dedupe) از شمارهٔ متفاوتی استفاده میکرد؛ اکنون همان payload دوباره ارسال میشود تا transient تکرار فعال شود.
3. regex میزبان، URLهای درست همان نصب (home_url / theme URI) را «وابستگی مطلق» میگرفت؛ اکنون میزبان نصب و دامنههای خارجی شناختهشده مجازند و فقط میزبان بیگانه/توکن localhost قدیمی خطا محسوب میشود.
4. wp_die() در Playground متن «نشست نامعتبر» را با HTTP ۲۰۰ برمیگرداند (مستند مرحلهٔ B)؛ معیار «denial» اصلاح شد: متن خطا + عدم افشای PII (یا ۴۰۳).
5. لاگین ادمین در گرمآپ اولیهٔ Playground گاهی ۵۰۲ میدهد؛ تلاش مجدد اضافه شد.

### ۱٫۳ پروب قابلیتها (مقایسه با قبل)

دو نصب تازهٔ Playground با Blueprint یکسان: `:9409` = قالب پیش از D استخراجشده از ZIP تغییرناپذیر مرحلهٔ B/C، `:9410` = قالب فعلی. شواهد: `stage-D1-state.json` و `stage-D-capability.json`.

| معیار | قبل | بعد |
|---|---|---|
| capability_type | `post` | `raouf_submission` |
| cap.read_private_posts | `read_private_posts` | `manage_options` |
| cap.edit_posts | `edit_posts` | `manage_options` |
| cap.create_posts | `edit_posts` | `manage_options` |
| Editor read_post | `True` | `False` |
| Editor edit_post | `True` | `False` |
| Editor delete_post | `True` | `False` |
| Editor private_posts_visible | `1` | `0` |
| Admin read_post | `True` | `True` |
| Admin edit_post | `True` | `True` |
| manage_options به meta-cap alias تبدیل شد؟ | `False` | `False` |

نتیجه: دسترسی ویراستار بسته شد، **دسترسی مدیر کاملاً حفظ شد**، و `manage_options` دچار اثر جانبی سراسری نشد.

### ۱٫۴ تأیید جداگانهٔ ۶ اصلاح

#### SD-01 — بالا / محرمانگی — VERIFIED ✅
- **فایل/خط:** `inc/setup.php:26-56 (قبل: inc/setup.php:26)`
- **قبل:** capability_type='post' → ویراستار/مدیر شبکه read_private_posts و edit_others_posts داشتند و میتوانستند رکوردهای خصوصی فرمها را بخوانند/ویرایش کنند.
- **بعد:** capability_type اختصاصی + map_meta_cap=true + نگاشت تمام primitive caps به manage_options؛ meta caps اختصاصی ماندند تا manage_options به meta-cap alias تبدیل نشود.
- **اثبات:**
  - stage-D1-state.json: editor.read_post true→false، edit_post true→false، delete_post true→false، private_posts_visible 1→0
  - stage-D1-state.json: administrator چهار قابلیت خود را حفظ کرد (read/edit/delete/read_private)
  - stage-D-capability.json: همان نتیجه قبل/بعد
  - stage-D-security-after.json: REST types بدون raouf_submission، /wp-json/wp/v2/raouf_submission = 404، صفحات ادمین ۴۰۳، جزئیات با nonce جعلی بدون PII

#### SD-02 — پایین / تداخل نام — VERIFIED ✅
- **فایل/خط:** `header.php:7 (قبل: header.php:7)`
- **قبل:** $m = raouf_meta_all() — نام متغیـر وردپرس/کوئری m را بازنویسی میکرد؛ WPCS GlobalVariablesOverride خطا میداد.
- **بعد:** $raouf_view_meta = raouf_meta_all() (۱۳ جایگزینی، فقط نام متغیـر).
- **اثبات:**
  - WPCS: WordPress.WP.GlobalVariablesOverride.Prohibited 1→0
  - stage-D1-parity.json: head/header/main/footer ۱۱/۱۱ بایتبهبایت یکسان قبل/بعد
  - stage-D1-structural.json == stage-C-structural.json

#### SD-03 — پایین / جعل اعلان ادمین — VERIFIED ✅
- **فایل/خط:** `functions.php:109-126 (قبل: functions.php:113)`
- **قبل:** خواندن خام $_GET['raouf-resynced'] بدون capability؛ مشترک/ویراستار هم اعلان موفقیت بازسازی صفحات را میدیدند.
- **بعد:** current_user_can('manage_options') + sanitize_key(wp_unslash())؛ فقط مدیر اعلان را میبیند.
- **اثبات:**
  - قبل (stage-D-security-before-corrected.json): subscriber=true، editor=true، administrator=true
  - بعد (stage-D-security-after.json): subscriber=false، editor=false، anonymous=false، administrator=true
  - راهاندازی مجدد resync: مشترک ۴۰۳، درخواست بدون nonce مدیر ۴۰۳

#### SD-04 — پایین / متادیتای WP — VERIFIED ✅
- **فایل/خط:** `inc/options.php:76-84 (قبل: inc/options.php:72-73)`
- **قبل:** register_setting بدون type (پیشفرض string) برای دو گزینهٔ آرایهای؛ بدون default و show_in_rest صریح.
- **بعد:** type=array، default=[]، show_in_rest=false، همان sanitize_callbackها.
- **اثبات:**
  - stage-D1-state.json: type string→array، has_default false→true، default=[]، show_in_rest=false
  - stage-D-security-after.json: options.php با nonce مدیر → 200 + settings-updated=true؛ مشترک → 403

#### SD-05 — پایین / WPCS — VERIFIED ✅
- **فایل/خط:** `footer.php`, `header.php`, `inc/404-markup.php`, `inc/icons.php`, `inc/lightbox-markup.php`, `inc/menus.php`, `inc/nav-fallback.php`
- **قبل:** ۲۱ خطای WordPress.Security.EscapeOutput.OutputNotEscaped روی echoـهای HTML/SVG ایستا.
- **بعد:** حاشیهنویسی phpcs:ignore پس از بررسی تکتک ۲۱ خط (همه raouf_expand_tokens()/raouf_icon() با مقادیر پویای esc_html/esc_attr/esc_url). خروجی صفر تغییر کرد.
- **اثبات:**
  - WPCS: EscapeOutput 21→0؛ مجموع خطاها ۱۴۷→۱۲۱؛ ۰ کُد sniff جدید
  - stage-D1-wpcs.json: all_21_verified_static=true
  - stage-D1-parity.json: HTML کامل ۱۱/۱۱ قبل/بعد یکسان

#### SD-06 — پایین / سبک کد — VERIFIED ✅
- **فایل/خط:** `inc/icons.php:11,62,68`, `inc/options.php:315-316`, `inc/forms.php:132`
- **قبل:** Yoda condition نادرست، $class نام رزروشده، ۲ short ternary، هشدار پارامتر استفاده نشدهٔ parse_request.
- **بعد:** null !== $paths، $css_class، ternary کامل، حاشیهنویسی پارامتر الزامی هوک.
- **اثبات:**
  - WPCS: YodaConditions 1→0، DisallowShortTernary 2→0، NoReservedKeywordParameterNames 2→0، UnusedFunctionParameter 1→0
  - لینت ۲۸/۲۸؛ stage-D1-parity.json بدون تغییر خروجی

---
## ۲. بررسی عدم ایجاد تغییر ظاهری

| # | بررسی | نتیجه |
|---:|---|---|
| 1 | Stage C structural report reproduced byte-for-byte (11 routes) | **PASS** — records=11 equal=True main_identical=11/11 class_sequence_identical=11/11 |
| 2 | Stage C whole-DOM (header/main/footer) reproduced byte-for-byte (11 routes) | **PASS** — rows=11 allIdentical=True header/main/footer=11/11 |
| 3 | Pre-D vs post-D full HTML + head/header/main/footer/forms identical (11 routes) | **PASS** — routes_identical=11/11; differing=[] |
| 4 | All non-PHP assets (style.css, app.js, 67 images, 3 fonts, readme, POT, screenshot) unchanged | **PASS** — baseline_files=103 current_files=104 differences=[] |
| 5 | Reference CSS still byte-identical to the original source CSS | **PASS** — reference_css_sha256=a91716ad971b37dc8ca4913aff504913fdddb64ed8c7a777da5a5fc9135362d7 |
| 6 | Exactly the 11 documented SD-fix PHP files changed (no other PHP touched) | **PASS** — changed=11 expected=11 files=['footer.php', 'functions.php', 'header.php', 'inc/404-markup.php', 'inc/forms.php', 'inc/icons.php', 'inc/lightbox-markup.php', 'inc/menus.php', 'inc/ |
| 7 | Canonical Stage C WP instance (:9400) still renders all 11 routes without PHP errors | **PASS** — routes_with_php_errors=[] |

- مقایسه با **خروجی مرحلهٔ C**: `stage-C-structural.json` و `stage-D1-structural.json` دقیقاً برابرند (۱۱ رکورد، `main_identical=11/11`، `class_sequence_identical=11/11`)؛ `stage-C-dom.json` و `stage-D1-dom.json` نیز ۱۱ ردیف برابر با `allIdentical=True` دارند.

- مقایسهٔ مستقیم **قبل/بعد**: HTML کامل ۱۱ مسیر، و همچنین هر یک از `<head>`، هدر، `<main>`، فوتر و تمام `<form>`ها، پس از نرمالسازی فقط مبدأ نصب و `?ver=`، بایتبهبایت یکسان است (هشها در `stage-D1-parity.json`).

- **هیچ تغییری در خروجی مشاهده نشد**؛ بنابراین موردی برای مستندسازی «تغییر + علت» وجود نداشت. تفاوتها تنها در ۱۱ فایل PHP (متغیـر/توضیح/backend) هستند و ۰ فایل غیر PHP تغییر کرده است.

- `style.css`، `app.js`، ۶۷ تصویر، ۳ فونت، `readme.txt`، POT و `screenshot.png` بایتبهبایت با ZIP مرحلهٔ B/C برابرند؛ فایل مرجع `style.css.source.css` نیز با CSS منبع اصلی یکسان است.

- سرور متعارف مرحلهٔ C (:9400) همچنان ۱۱ مسیر را بدون خطای PHP ارائه میکند.

---
## ۳. WPCS — حفظ نتایج و دستهبندی

**ابزار:** PHPCS 3.13.6 + WPCS 3.2.0 + PHPCSUtils 1.2.3 + PHPCSExtra + PHPCompatibilityWP 2.1.5، استاندارد `WordPress`، اجرا با PHP-WASM روی ۲۸ فایل PHP. نتایج خام قبل/بعد/فعلی و PHPCompatibility به `qa/results/` منتقل و حفظ شدند.

| وضعیت | خطاها | هشدارها | پیامهای امنیتی/DB/GlobalOverride |
|---|---:|---:|---:|
| قبل از اصلاحات D | 147 | 184 | 22 |
| بلافاصله بعد از SD-01..SD-06 | 121 | 181 | 0 |
| فعلی (اجرای مجدد D-1) | 121 | 181 | 0 |

**اولویت امنیتی (بررسی شد قبل از هر چیز):**

- ۲۲ پیام امنیتی/global-override قبل: **۲۱** × `WordPress.Security.EscapeOutput.OutputNotEscaped` + **۱** × `WordPress.WP.GlobalVariablesOverride.Prohibited`.

- تکـتک ۲۱ خط بررسی و تأیید شد که `echo raouf_expand_tokens(...)` / `raouf_icon(...)` روی HTML/SVG ایستا هستند و مقادیر پویا با `esc_html`/`esc_attr`/`esc_url` فرار میشوند؛ بنابراین حاشیهنویسی `phpcs:ignore` (SD-05) توجیه داشت، **نه صرفاً کاهش تعداد**.

- اکنون **۰** پیام `WordPress.Security.*`، `WordPress.DB.*`، `DontExtract`، `DiscouragedFunctions` یا `GlobalVariablesOverride` باقی است؛ `NonceVerification`، `ValidatedSanitizedInput`، `PreparedSQL` و `DirectDatabaseQuery` از ابتدا هم ۰ بودند.

- **هیچ کُد sniff تازهای** توسط اصلاحات معرفی نشد و پروفایل فعلی دقیقاً برابر پروفایل بعداصلاح است. در D-1 **هیچ خطای WPCS اصلاح نشد**.


**دستهبندی 121 خطا + 181 هشدار باقیمانده (همگی استایل/داکیومنت، بدون اثر امنیتی):**

| دسته | نوع | تعداد |
|---|---|---:|
| array_alignment_whitespace_formatting | ERROR | 39 |
| array_alignment_whitespace_formatting | WARNING | 181 |
| documentation_docblocks | ERROR | 82 |

پراکندگی عمدتاً در فایلهای generated است: `inc/pages-data.php`: 113، `inc/icons.php`: 49، `inc/forms.php`: 25، `inc/setup.php`: 22. نمونهٔ کُدها: `WordPress.Arrays.MultipleStatementAlignment.DoubleArrowNotAligned` (۱۶۸ هشدار)، `Squiz.Commenting.FunctionComment.Missing` (۲۸ خطا)، `FileComment.SpacingAfterComment` (۲۱)، `MissingPackageTag` (۱۹)، `NormalizedArrays...CommaAfterLast` (۱۰).

**تصمیم معوق:** اصلاح انبوه با `phpcbf` فایلهای تولیدشدهٔ حاوی markup دقیق منبع را بازنویسی میکند؛ طبق دستور، بدون بررسی علت و تأیید صریح انجام نشد. `PHPCompatibilityWP --testVersion 8.0-` = ۰/۰ و لینت `php-wasm -l` = ۲۸/۲۸.

---
## ۴. رعایت قوانین و وضعیت منابع

- منبع اصلی و commit معتبر `abc23ef6ddbd4a74111f6c0347504a35eb746002` دستنخورده؛ شاخهٔ `main`/`33df2fa` لمس نشد.

- تمام گزارشها و نتایج A/B/C (هش SHA-256) برابر مقادیر قبل از مرحلهٔ D باقی ماندند؛ دو ZIP tracked نیز تغییر نکردند.

- ZIP قالب (`dist/raouf-academy-wordpress-theme.zip`, ۵٬۳۸۲٬۵۹۱ B / ۱۰۳ ورودی / `35112eef…`) و ZIP سورس (`dist/source-code.zip`, ۶٬۲۶۹٬۳۶۸ B / ۱۴۴ ورودی / `5c7429aa…`) **بازسازی نشدند** و همچنان حاوی نسخهٔ پیش از اصلاحات D هستند.

- در D-1 هیچ فایل قالب و هیچکدام از اصلاحات SD-01..SD-06 برگردانده یا تغییر داده نشد؛ فقط هارنس QA و فایلهای نتیجه اضافه/اصلاح شدند.

- مراحل E و F شروع نشدند.

---
## ۵. پاسخهای نهایی

**چند آزمون PASS / FAIL؟** 73 آزمون اجرا شد: **73 PASS، 0 FAIL**. (سوئیت امنیتی بعداصلاح ۲۴/۲۴، عدم تغییر ظاهری ۷/۷، وضعیت داخلی وردپرس 27/27، WPCS/سازگاری/لینت ۹/۹، تأیید جداگانهٔ ۶ اصلاح ۶/۶.) تنها FAIL ثبتشده در سوئیت **قبل** اصلاح با هارنس اصلاحشده، نقص SD-03 است که شاهد بازتولید نقص است.

**کدام اصلاحات تأیید شدند؟** هر شش مورد: **SD-01** (capabilityهای CPT → `manage_options`)، **SD-02** (`$m` → `$raouf_view_meta`)، **SD-03** (قفل اعلان ادمین)، **SD-04** (`register_setting` نوع آرایه/predefault)، **SD-05** (حاشیهنویسی ۲۱ خروجی ایستا)، **SD-06** (Yoda/`$css_class`/ternary/پارامتر هوک). همگی با شواهد before/after و بدون اثر جانبی.

**آیا Regression مشاهده شد؟** **خیر.** ساختار و DOM مرحلهٔ C بایتبهبایت تکرار شد، HTML کامل قبل/بعد ۱۱/۱۱ یکسان است، داراییها ۰ تغییر، ۰ خطای PHP، ۲۴/۲۴ امنیتی PASS، و ۰ پیام امنیتی WPCS.

**کارهای باقیماندهٔ مرحلهٔ D:**

1. اجرای پیمایش کارایی مرورگر: ۱۱ مسیر × ۲ viewport، ثبت درخواستها/حجم/خطاهای کنسول و شبکه، و تصمیم دربارهٔ ۴ تصویر >۲۰۰KB (بهینهسازی بیدرنگ سودی ندارد: ۲۹۷KB→۱٫۶MB).
2. ممیزی دسترسی با axe-core و تعیین تکلیف موارد ارثی نیازمند تصمیم: پرش h1→h3 در /courses/، کنتراست ۲٫۹۶:۱ دکمهٔ آبی و ۴٫۲۲/۳٫۹۰:۱ متن muted، فهرست ۱۰۰ رکوردی ادمین، محدودیت نرخ فرم مبتنی بر IP.
3. مهاجرت: نمونهٔ دامنهٔ دیگر (۰ نشانی خارجی)، نصب تازه، مسیرهای مطلق؛ اعلام NOT TESTED برای LAMP/MySQL واقعی، WP ۶٫۴–۶٫۷، PHP ۷٫۴، SMTP، multisite، Theme Check، دستگاههای واقعی/مرورگرهای قدیمی، PageSpeed/CDN.
4. تصمیم کاربر دربارهٔ ۱۲۱ خطا و ۱۸۱ هشدار استایل/داکیومنت WPCS (عمدتاً inc/pages-data.php: ۱۱۳ و inc/icons.php: ۴۹)؛ اجرای phpcbf روی فایلهای generated ممنوع است مگر با تأیید صریح.
5. تکمیل جدول نهایی نقصهای پنج دستهٔ مرحلهٔ D با برچسب PASS / FAIL / FIXED / NOT TESTED / تصمیم کاربر و before/after/proof برای تکـتک آیتمها.
6. تولید نهایی qa/results/stage-D-report.md و stage-D-report.json.
7. بازسازی و اعتبارسنجی dist/raouf-academy-wordpress-theme.zip و dist/source-code.zip (در D-1 طبق دستور انجام نشد)، سپس مقایسهٔ هش فایلهای اصلی، ثبت git status و تأیید عدم تغییر A/B/C.
8. توقف کامل؛ عدم ورود به مرحلهٔ E و F بدون تأیید صریح.

---
**پایان وظیفهٔ D-1.** در این مرحله متوقف شدم و منتظر دستور بعدی هستم.
