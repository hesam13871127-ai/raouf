# گزارش تست اصلاح نهایی — نسخه ۱٫۱٫۰

تاریخ تحویل: ۲۰۲۶‑۱۱‑۰۷ UTC. محیط تست: WordPress Playground 6.8.3 / PHP 8.3.36 WASM + SQLite و Chromium headless.

## خلاصه
**۱۳/۱۳ آزمون PASS**، **71/71 بررسی PASS**، **۰ FAIL**.

- لینک رسمی بلد `https://balad.ir/p/29UbcoR7CtjsIN` در ۱۱ مسیر (۱۲ لینک، `target="_blank"`).
- هر دو فرم قبل از پاسخ موفقیت در جدول اختصاصی افزونه ذخیره میشوند؛ خطای عمدی ذخیرهسازی HTTP 500 و پیام واقعی دارد.
- منوی «درخواست‌های آموزشگاه رئوف» با زیرمنوهای «همه درخواست‌ها»، «پیش‑ثبت‑نام دوره‌ها»، «پیام‌های تماس با ما».
- 66/66 جفت بصری AE=0؛ 71 دارایی تصویری/فونت و قواعد CSS بدون تغییر.
- نسخه مرجع قدیمی `raouf-academy-wordpress-theme.zip` با SHA-256 `abe4a961a4049ecdc86b1866a0d9e2eb0949eee1590bd730745e41dc7b3a4907` دستنخورده است.

## فایلهای تحویلی
| فایل | نام | اندازه (بایت) | SHA-256 |
|---|---|---:|---|
| قالب اصلاحشده | `raouf-academy-wordpress-theme-v1.1.0.zip` | 5,385,482 | `0c0f48cd4f76cc7985e1ea097ebf555f291bb074d27d6699e8dedbd326853167` |
| افزونه مستقل | `raouf-academy-requests-plugin-v1.0.0.zip` | 10,766 | `807508d8ad9b3757c8098f9d5e70bcb648b99a770be75a70b4424e4e375eea77` |
| گزارش تست فارسی | `raouf-academy-correction-test-report-fa.pdf` | 452,588 | `04ffbcb2638f668a1967556c6a23ec07523c71cab65f2de3252e98b65ef6843f` |
| راهنمای نصب و فعالسازی | `raouf-academy-install-activation-fa.pdf` | 327,309 | `7db96c5b251cc3e205170b98b69b83a0fbace68aafb8c928ee9ee22e23f52acd` |

## ۱۳ آزمون
| کد | عنوان | نتیجه | بررسیها |
|---|---|---|---|
| T01 | ثبت کامل پیشثبتنام دوره و جلوگیری از ارسال مجدد | PASS | 3/3 |
| T02 | جلوگیری از ثبتنام ناقص و اعتبارسنجی سمت سرور/مرورگر | PASS | 2/2 |
| T03 | ثبت کامل فرم تماس، بدون بارگذاری مجدد صفحه | PASS | 2/2 |
| T04 | جلوگیری از تماس نامعتبر و بررسی همه فیلدها | PASS | 2/2 |
| T05 | ذخیره دائمی هر دو درخواست در پایگاه داده وردپرس | PASS | 13/13 |
| T06 | نمایش در پیشخوان با منوها و دستههای جداگانه، newest→oldest | PASS | 8/8 |
| T07 | تاریخ و زمان دقیق محلی وردپرس | PASS | 3/3 |
| T08 | نمایش کامل جزئیات هر رکورد | PASS | 2/2 |
| T09 | جستجو، فیلتر نوع/تاریخ، خروجی CSV و حذف با تأیید | PASS | 9/9 |
| T10 | دسترسی فقط manage_options، CSRF/XSS/SQLi و محافظت ربات | PASS | 9/9 |
| T11 | لینک رسمی بلد در تمام صفحات نقشه و باز شدن در برگه جدید | PASS | 13/13 |
| T12 | عدم وجود خطای PHP و JavaScript | PASS | 3/3 |
| T13 | عدم تغییر طراحی دسکتاپ و موبایل و سایر تعاملات | PASS | 2/2 |

## شواهد تکمیلی
- مرورگر: 6/6، خطای JS: 0
- تعاملات: 28/28، خطای کنسول: 0
- بصری: 14/14 بررسی، ۶ خطای 404 عمدی مسیر `/404/`، ۰ درخواست ناموفق
- همسانی داراییها: 9/9؛ فقط ۹ فایل عملکردی تغییر کرد
- CSV: PASS (RFC 4180، BOM، ۱۳ ستون، محافظت فرمول، پاکسازی XSS)

## اصلاحات پس از اجرای اولیه
بررسی CSV ابتدا بهدلیل حساسیت هارنس به حروف کوچک/بزرگ کلید `Content-Type` FAIL شد؛ با صادرات مجدد واقعی و اصلاح نویسنده CSV به RFC 4180، T09 به PASS اصلاح شد. جزئیات در `qa/results/v110-csv-verify.json`.

## NOT TESTED
- real MySQL/MariaDB/LAMP
- SMTP
- multisite
- WP 6.4-6.7/>6.8.3
- PHP 7.4/8.0/8.1/8.2 runtime
- physical devices/old browsers/assistive tech
- third-party plugins/builders/WooCommerce/LMS
- Theme Check
- PageSpeed/CDN/load
- real host-to-host DB migration

نتایج خام: `qa/results/v110-13-tests.json`، `v110-visual.json`، `v110-browser.json`، `v110-interactions.json`، `v110-asset-parity.json`، `v110-csv-verify.json`.
