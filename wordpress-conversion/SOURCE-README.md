# Raouf Academy — WordPress theme source

بستهٔ کد منبع تبدیل دقیق وب‌سایت «آموزشگاه فنی و حرفه‌ای رئوف» به قالب وردپرس.

## محتوا

| مسیر | توضیح |
| --- | --- |
| `theme/raouf-academy/` | قالب کامل (همان محتوای `raouf-academy-wordpress-theme.zip`، و همچنین `assets/css/style.css.source.css` بهعنوان مرجع بایتبهبایت CSS اصلی) |
| `tools/convert.py` | مبدل HTML/CSS/JS منبع به قالب PHP وردپرس |
| `tools/build_zip.py` | سازندهٔ بستهٔ نصبی و بستهٔ کد منبع |
| `tools/make_pot.py` | بازسازی `languages/raouf-academy.pot` از تمام فایل‌های PHP |
| `qa/compare.py` | مقایسهٔ ساختاری `<main>` منبع و خروجی وردپرس |
| `qa/dom-compare.py` | مقایسهٔ کامل DOM (هدر / محتوا / فوتی) |
| `qa/visual.mjs` | عکسبرداری مرورگر واقعی در ۶ اندازه و ۱۰ مسیر |
| `qa/recheck.mjs` | بازعکسبرداری با انتظار کامل برای تصاویر lazy |
| `qa/interactions.mjs` | تست تعاملات JS، منو‌ها، لایتباکس و فرم‌ها |
| `qa/forms.py` | تست HTTP نقاط پایانهٔ فرم‌ها، CSRF، اعتبارسنجی، تکرار و محدودیت نرخ |
| `qa/upload-test.mjs` | تست بارگذاری و فعالسازی ZIP از پیشخوان وردپرس |
| `qa/make-pdfs.mjs` | تولید PDFهای فارسی با فونت Vazirmatn |
| `qa/stage-C-audit.py` | ممیزی مسیربه مسیر مرحلهٔ C: DOM کامل، SEO، لینکها، داراییها، الگوها، ۴۰۴، توکنها |
| `qa/stage-C-visual.mjs` | عکسبرداری ۱۱ مسیر در ۲ اندازه (دسکتاپ/موبایل) از سایت اصلی و وردپرس |
| `qa/stage-C-visual-compare.py` | مقایسهٔ پیکسلی `AE`/`RMSE` همان ۲۲ جفت + تأیید بی‌درنگ PNG |
| `qa/stage-C-interactions.mjs` | تست هدر/فوتی/منو/نوار تماس/RTL/واکنش‌گرا در ۱۱ مسیر × ۲ اندازه، دوره‌ها، hover/focus، فرمها |
| `qa/stage-C-gallery-faq.mjs` | هم‌ارزی فیلترهای گالری، لایتباکس، کلیدهای جهتنما/Escape و آکاردئونهای FAQ |
| `qa/stage-C-domain.py` | بررسی تمام لینک‌های داخلی روی دامنهای متفاوت از نصب |
| `qa/stage-C-report.py` | تولید گزارش نهایی مرحلهٔ C از تمام نتایج JSON |
| `qa/stage-D-*.py` / `qa/stage-D1-*` | ممیزی امنیت، بررسی قابلیتها، WPCS و گزارش D-1 (۷۳/۷۳ PASS) |
| `qa/stage-F-*.py` / `.mjs` | سوئیت نهایی: نصب ZIP، ۶۶ مقایسهٔ بصری، تعاملات، DOM، لینکها، مهاجرت دامنه، فرمها، امنیت تکمیلی، WPCS، عملکرد/دسترسپذیری/کنسول، اعتبارسنجی نهایی |
| `qa/results/` | تمام گزارشهای مراحل A/B/C/D-1/F، اسکرینشاتهای نصب و فعالسازی، و JSON نتایج |
| `docs/` | راهنمای نصب، گزارش تبدیل، تصمیمات معماری، **گزارش نهایی تست `final-test-report-fa.md`** (Markdown و PDF) |

فایل‌های `__pycache__`, `*.pyc`, کشها، پوشهٔ `dist/` و سرورهای موقت از بسته حذف شده‌اند.

## منبع مرجع

منبع معتبر، شاخهٔ `arena/dfee8ce0-raouf` مخزن `hesam13871127-ai/raouf`،
کامیت `abc23ef6ddbd4a74111f6c0347504a35eb746002` و فایل
`raouf-academy-template.zip` است. شاخهٔ `main` (کامیت `33df2fa`) ناقص است و
استفاده نشده است. نسخهٔ استخراجشدهٔ دست‌نخورده در
`.work/wp-source/raouf-academy/` نگهداری می‌شود.

## نکتهٔ معماری (D01)

محتوای صفحات وردپرس شامل توکن‌های قابل حمل `{{ASSET:}}`, `{{LINK:}}`,
`{{SITE_NAME}}` و … ذخیره می‌شود و هنگام رندر با نشانی جاری سایت جایگزین
می‌شود؛ بنابراین تغییر دامنه یا انتقال `localhost → production` نیازی به
ویرایش صفحات یا PHP ندارد.

## نصب

`raouf-academy-wordpress-theme.zip` را از مسیر
**Appearance → Themes → Add New → Upload Theme** بارگذاری و فعال کنید.
جزئیات در `docs/installation-guide-fa.pdf`.

## مجوز

کد قالب تحت GPLv2 یا نسخه‌های بعدتر؛ فونت Vazirmatn تحت OFL.
