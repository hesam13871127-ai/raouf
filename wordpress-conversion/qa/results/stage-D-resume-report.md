# گزارش وضعیت مرحلهٔ D — نقطهٔ توقف / ازسرگیری

**تاریخ:** ۲۰۲۶-۱۱-۰۹ (UTC)
**شاخه:** `arena/dfee8ce0-raouf` — **active**
**HEAD:** `abc23ef6ddbd4a74111f6c0347504a35eb746002`
**`git status --short`:** `?? wordpress-conversion/` (بدون تغییر در فایلهای tracked، بدون commit/push جدید)
**وضعیت:** مرحلهٔ D نیمهتمام است؛ اجرا بهدلیل محدودیت Tool-call متوقف شد. در این نوبت **هیچ کد/اصلاح/تست جدیدی انجام نشد**؛ فقط خوانش وضعیت و ثبت همین گزارش.

---

## ۱) بررسیهای انجامشده تا این لحظه از مرحلهٔ D

| # | بررسی | نتیجهٔ ثبتشده |
|---|---|---|
| ۱ | خوانش اولیهٔ فقطخواندنی: branch/HEAD/status، فهرست ۱۰۴ فایل قالب (۲۸ PHP)، `functions.php`، `inc/forms.php`، `inc/options.php`، `inc/setup.php`، `inc/helpers.php`، `inc/icons.php`، `inc/nav-fallback.php`، `header.php`، `footer.php` | انجام شد؛ بدون نتیجهگیری PASS/FAIL |
| ۲ | ممیزی امنیتی ایستا: nonce/capability عملیات ادمین، sanitization ورودی فرمها، escaping خروجی/XSS، محافظ `ABSPATH`، محرمانگی submissionها، REST API، درخواستهای سمت سرور، نبود SQL خام، نبود `localhost`/وابستگی مطلق، اسکن قابلیتهای PHP ۸٫۱+، تداخل نامها | انجام شد (یافتهها در بند ۳) |
| ۳ | **WPCS رسمی ۳٫۲٫۰** + PHPCS ۳٫۱۳٫۶ + PHPCSUtils/PHPCSExtra/PHPCompatibilityWP روی ۲۸ فایل PHP (از طریق `php-wasm`) — قبل: **۱۴۷ خطا / ۱۸۴ هشدار / ۲۱ خطای `EscapeOutput`**؛ بعد: **۱۲۱ خطا / ۱۸۱ هشدار / ۰ خطای `EscapeOutput`** | خروجیهای JSON فقط در `/tmp/staged-wpcs-before.json` و `/tmp/staged-wpcs-after.json` هستند و **هنوز به `qa/results/` منتقل نشدهاند** |
| ۴ | `PHPCompatibilityWP --testVersion 8.0-` | بدون خطا (گزارش خالی) |
| ۵ | لینت `php-wasm -l` روی ۲۸ فایل PHP | ۲۸/۲۸ موفق |
| ۶ | **پروب قابلیت قبل/بعد** (`qa/stage-D-capability-blueprint.json`، دو اجرای Playground تازه روی :۹۴۰۶) → `qa/results/stage-D-capability.json` | قبل: Editor میتوانست رکورد خصوصی را بخواند/ویرایش کند (`read_private_posts` = `read_private_posts`، ۱ رکورد قابل مشاهده)؛ بعد: `false` / `false` / ۰ رکورد، cap = `manage_options` |
| ۷ | اسکریپت امنیتی پویا `qa/stage-D-security.py` و **فقط اجرای «قبل»** روی نسخهٔ پیش از D (قالب استخراجشده از ZIP مرحلهٔ B/C، :۹۴۰۷) → `qa/results/stage-D-security-before.json` | **۱۸/۲۴ PASS، ۶ FAIL**؛ ۱ FAIL شاهد واقعی نقص قبلاصلاح (SD-03)، ۴ FAIL ناشی از ردشدن payload تست توسط validation فرم (HTTP 400) و در نتیجه نبود رکورد برای تست جزئیات، ۱ FAIL ناشی از regex اشتباه تشخیص میزبان (URLهای درست همان نصب `127.0.0.1:9407` را «وابستگی» گرفته). اجرای «بعد» روی :۹۴۰۰ **انجام نشده** |
| ۸ | بررسی ایستای کارایی/دسترسی/مهاجرت | ۹۸ تگ `<img>`: همگی `alt`/`width`/`height`/`decoding`، ۹۶ `srcset`، ۸۹ `loading=lazy`، ۹ `eager`؛ ۶۷ تصویر = ۴٬۷۰۴٬۸۶۴ B، ۴ تصویر >۲۰۰KB؛ آزمون فشردهسازی بیدرنگ روی بزرگترین (`classroom-03.webp` ۲۹۷٬۶۲۶ B → ۱٬۶۴۳٬۶۵۶ B، یعنی بُردی وجود ندارد)؛ ۳ فونت، ۰ فایل تکراری بایتبهبایت، ۰ `localhost` در PHP/CSS/JS؛ ساختار هدینگها، labelها، ARIA و کنتراست (دکمهٔ آبی ۲٫۹۶:۱، متن muted ۴٫۲۲/۳٫۹۰:۱) — همگی **ارثی از سایت منبع** و نیازمند تصمیم کاربر |
| ۹ | مقایسهٔ هش SHA-256 با خط مبنا | فایلهای tracked، ZIPهای tracked، و تمام گزارشهای A/B/C **بدون تغییر** (بند ۴) |

**سرورهای زنده:** `:3000` (سایت اصلی)، `:9400` (WP با کد فعلی)، `:9401` (ZIP هسته)، `:9402` (نصب تازه)، `:9406` (پروب قابلیت، نسخهٔ بعداصلاح)، `:9407` (نسخهٔ پیش از D extracted از ZIP). نکته: :۹۴۰۷ یکبار بهدلیل پرشدن محدودیت نرخ فرم (۸ درخواست/۱۵ دقیقه) ریاستارت شد و آخرین درخواست دیباگ `502` گرمآپ برگرداند؛ پس از آن هیچ تستی اجرا نشد.

---

## ۲) فایلهای تغییرکرده

### ۲٫۱ قالب — **۱۱ فایل PHP ویرایش شدهاند** (نسبت به ZIP مرحلهٔ B/C)

| فایل | خطوط `+/-` | ماهیت تغییر |
|---|---:|---|
| `inc/setup.php` | +30 / −1 | SD-01: `capability_type` اختصاصی + نگاشت capabilityها به `manage_options` |
| `inc/options.php` | +15 / −4 | SD-04: `type=array`/`default`/`show_in_rest=false` برای `register_setting` + حذف short ternary |
| `header.php` | +15 / −15 | SD-02: تغییر نام `$m` → `$raouf_view_meta` (تداخل با متغیر وردپرس) |
| `functions.php` | +11 / −2 | SD-03: قفل `manage_options` و `sanitize_key(wp_unslash())` روی اعلان ادمین |
| `inc/menus.php` | +6 / −6 | SD-05: حاشیهنویسی `phpcs:ignore` برای echoـهای SVG ایستا |
| `inc/icons.php` | +5 / −5 | SD-05/SD-06: حاشیهنویسی، Yoda condition، `$class` → `$css_class` |
| `footer.php` | +4 / −4 | SD-05: حاشیهنویسی |
| `inc/nav-fallback.php` | +4 / −4 | SD-05: حاشیهنویسی |
| `inc/404-markup.php` | +1 / −1 | SD-05: حاشیهنویسی |
| `inc/forms.php` | +1 / −1 | SD-06: حاشیهنویسی پارامتر لازم ولی استفاده نشدهٔ `parse_request` |
| `inc/lightbox-markup.php` | +1 / −1 | SD-05: حاشیهنویسی |

**تغییر نکردهاند:** `style.css`، `assets/css/style.css.source.css` (فقط مرجع؛ عمداً از ZIP نصبی حذف میشود، D13)، `assets/js/app.js`، ۶۷ تصویر، ۳ فونت، `screenshot.png`، `readme.txt`، `languages/*.pot`، سایر ۱۷ فایل PHP، و تمام فایلهای `tools/`، `docs/`، `SOURCE-README.md`. بررسی بایتبهبایت: **۰ فایل غیر PHP تغییرکرده**.

### ۲٫۲ فایلهای QA جدید مرحلهٔ D (خارج از ZIPها)

- `qa/stage-D-capability-blueprint.json` (۲٬۷۹۳ B)
- `qa/stage-D-security.py` (۱۷٬۸۹۳ B)
- `qa/results/stage-D-capability.json` (۱٬۷۷۲ B)
- `qa/results/stage-D-security-before.json` (۵٬۷۸۹ B)
- `qa/results/stage-D-resume-report.md` (**همین فایل**)

**Scratch خارج از سورس (ignore شده توسط `.gitignore:2 → .work/`):** `.work/wp-qa/lint/` (۳۱MB کلون PHPCS/WPCS)، `.work/wp-qa/stage-d-before/` (۵٫۸MB قالب استخراجشده)، و JSONهای `/tmp/staged-wpcs-*.json`، `/tmp/staged-capability.json`.

> توضیح تفاوتهای ظاهری در مقایسه با ZIP سورس: `README.md` ↔ `SOURCE-README.md` نگاشت عمدی `tools/build_zip.py:56` است و `assets/css/style.css.source.css` طبق D13 فقط در ZIP سورس میآید؛ هیچکدام تغییر مرحلهٔ D نیستند.

---

## ۳) آیا اصلاحی انجام شده است؟ — **بله، ۶ اصلاح اعمال شده است**

همهٔ آنها صرفاً backend/admin یا توضیح داخل PHP هستند و خروجی HTML/CSS/JS را تغییر نمیدهند؛ ولی **اعمال شدهاند** و هنوز تأیید نهایی بعداصلاح (DOM/تصویری/ZIP) انجام نشده است.

| ID | شدت | فایل | قبل → بعد | اثبات موجود |
|---|---|---|---|---|
| **SD-01** | بالا (محرمانگی) | `inc/setup.php:11` | CPT با `capability_type='post'` → نوع اختصاصی + تمام primitive caps = `manage_options` | `stage-D-capability.json`: Editor `read_post` true→false، `edit_post` true→false، رکوردهای قابل مشاهده ۱→۰ |
| **SD-02** | پایین (تداخل نام) | `header.php:7` | `$m` (متغیر/کوئری وردپرس) → `$raouf_view_meta` (۱۳ مورد) | WPCS `GlobalVariablesOverride` ۱→۰ |
| **SD-03** | پایین (جعل اعلان ادمین) | `functions.php:107` | خواندن خام `$_GET['raouf-resynced']` بدون قابلیت → `current_user_can('manage_options')` + `sanitize_key(wp_unslash())` | شاهد قبل: subscriber/editor اعلان را میدیدند (`stage-D-security-before.json`)؛ تست «بعد» انجام نشده |
| **SD-04** | پایین (متادیتای WP) | `inc/options.php:72` | `register_setting` بدون `type` (پیشفرض `string` برای آرایه) → `type=array`, `default=[]`, `show_in_rest=false` | WPCS/lint؛ تست ذخیرهٔ `options.php` انجام نشده |
| **SD-05** | پایین (WPCS) | ۷ فایل، ۲۱ خط | ۲۱ خطای `EscapeOutput` روی echoـهای HTML/SVG ایستای تأییدشده → ۰ (فقط `phpcs:ignore`) | WPCS قبل/بعد: ۲۱→۰؛ مجموع خطاها ۱۴۷→۱۲۱ |
| **SD-06** | پایین (سبک) | `inc/icons.php`, `inc/options.php`, `inc/forms.php` | Yoda، `$css_class`، ternary کامل، حاشیهنویسی پارامتر | لینت ۲۸/۲۸؛ WPCS هشدارها ۱۸۴→۱۸۱ |

**موارد یافتشده ولی عمداً اصلاحنشده (نیازمند تصمیم کاربر):** کنتراست رنگ دکمهٔ آبی/متن muted، پرش `h1→h3` در `/courses/`، ۴ تصویر >۲۰۰KB (بهینهسازی بیدرنگ سودی ندارد)، محدودیت ۱۰۰ رکوردی فهرست ادمین، ۱۲۱ خطا/۱۸۱ هشدار استایل WPCS در فایلهای generated.

---

## ۴) وضعیت ZIP قالب و ZIP سورس — **هیچکدام تغییر نکردهاند**

| فایل | اندازه | ورودیها | `testzip()` | SHA-256 | وضعیت |
|---|---:|---:|---|---|---|
| `dist/raouf-academy-wordpress-theme.zip` | ۵٬۳۸۲٬۵۹۱ B | ۱۰۳ | `OK` | `35112eef3f46f4a1c4973ae0e6e80fc94bb35e16e2fc829eb9a5003ccefcc4f8` | همان مرحلهٔ B/C؛ **شامل اصلاحات D و فایلهای QA مرحلهٔ D نیست** |
| `dist/source-code.zip` | ۶٬۲۶۹٬۳۶۸ B | ۱۴۴ | `OK` | `5c7429aa0e505604b5ce5e5bc37bc107ef0fdb78a0bec90b62abacb76f0bfcbe` | همان مرحلهٔ C؛ **۰ فایل `stage-D*` درون آن** |

هر دو فایل با آخرین ساخت مرحلهٔ C (۱۴:۳۳) باقی ماندهاند؛ یعنی فعلاً **محتوای ZIPها با کد فعلی قالب همخوان نیست** و بازسازی نهایی الزامی است.

**بدون تغییر تأییدشده:** `raouf-academy-template.zip` = `e583cec6…c58ea`، `raouf-academy-static.zip` = `3940d5ac…0b50`، و هشهای A/B/C (`stage-A-audit.json/md`، `stage-B-report.json/md`، `structural.json`، `visual-report.json`، `stage-C-report.json/md`) دقیقاً برابر مقادیر پیش از مرحلهٔ D هستند. سایت اصلی، commit معتبر، شاخهٔ `main`/`33df2fa` و ظاهر سایت دستنخوردهاند.

---

## ۵) کارهای باقیماندهٔ مرحلهٔ D (دقیقاً، به ترتیب)

1. **اصلاح اسکریپت تست** `qa/stage-D-security.py` (بدون دست زدن به قالب): رفع ۴ FAIL ساختگی (payload نام/شمارهٔ معتبر، رعایت محدودیت نرخ ۸/۱۵دقیقه، استخراج `raouf_view`، تفکیک میزبانِ همان نصب از «وابستگی مطلق»)؛ سپس اجرای **قبل** و **بعد** با یک نسخهٔ واحد اسکریپت و ذخیرهٔ `stage-D-security.json` شامل مقایسه.
2. **تأیید عدم regressions بعدازاصلاح** (خروجیها با پیشوند `stage-D-*` تا گزارشهای A/B/C بازنویسی نشوند): `STRUCTURAL_REPORT` / `DOM_REPORT` / مقایسهٔ کامل `<head>`و SEO، ۱۱ مسیر × ۲ viewport تصویری، ۲۸/۲۸ interaction، ۱۲/۱۲ gallery/lightbox/FAQ، ۲۸/۲۸ لینت، ۰ خطای PHP/کنسول.
3. **مهاجرت:** نمونهٔ دامنهٔ دیگر (توکنها/لینکها/assetها، ۰ نشانی خارجی)، نصب تازهٔ وردپرس، بررسی مسیرهای مطلق و `home_url`/`get_template_directory_uri`؛ اعلام **NOT TESTED** برای LAMP/MySQL واقعی، WP ۶٫۴–۶٫۷، PHP ۷٫۴، SMTP، multisite، Theme Check، SMTP/دستگاههای واقعی.
4. **کارایی:** پیمایش ۱۱ مسیر × ۲ viewport با ثبت درخواستها/حجم/خطاهای مرورگر، تأیید بارگذاری تنها یک CSS + یک JS + فونتها، و ثبت تصمیم دربارهٔ ۴ تصویر >۲۰۰KB.
5. **دسترسی:** اجرای axe-core (در صورت تأیید) و فهرست موارد ارثی نیازمند تصمیم (کنتراست، `h1→h3`) بدون اعمال تغییر ظاهری.
6. **WPCS:** انتقال نتایج رسمی قبل/بعد به `qa/results/`، ثبت ۰ یافتهٔ امنیتی، و گزارش ۱۲۱ خطا/۱۸۱ هشدار استایلی باقیمانده بهعنوان «تصمیم کاربر / انحراف مستند».
7. **تکمیل جدول نقصها** برای هر ۶ اصلاح: شناسه، شدت، فایل/خط، قبل، بعد، و تست اثبات؛ و تعیین تکلیف تکـتک آیتمهای پنجگانه با برچسب **PASS / FAIL / FIXED / NOT TESTED / تصمیم کاربر**.
8. **تولید نهایی** `qa/results/stage-D-report.md` و `qa/results/stage-D-report.json`.
9. **بازسازی و اعتبارسنجی نهایی** `dist/raouf-academy-wordpress-theme.zip` (ریشهٔ واحد `raouf-academy/`، ۱۰۳ ورودی، بدون فایل مرجع) و `dist/source-code.zip` (شامل تمام artifacts مرحلهٔ D، بدون `__pycache__`/`dist`/فایل موقت، ۰ نام تکراری) + `testzip() = OK`.
10. **کنترل پایانی:** مقایسهٔ هش فایلهای اصلی/ترacked/ZIPها با «قبل»، ثبت `git status --short`، تأیید عدم تغییر A/B/C و سایت اصلی، و **توقف کامل**.
11. **ممنوعیت پابرجا:** شروع نکردن مرحلهٔ E و F بدون تأیید صریح کاربر؛ هیچ تغییر ظاهر/رنگ/فونت/تصویر/چیدمان/متن/ساختار صفحه؛ هیچ پلاگین/Elementor/WooCommerce/LMS/قابلیت ساختگی؛ هیچ تغییر بدون دلیل و اثر مستند.

---

**تأکید:** در این نوبت هیچ کد، تست، اصلاح یا بازسازی ZIP انجام نشد؛ فقط بررسی وضعیت و ثبت این گزارش. منتظر دستور بعدی هستم.
