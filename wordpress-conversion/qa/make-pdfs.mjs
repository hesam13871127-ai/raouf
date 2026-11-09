/** Generate the two Persian PDF deliverables with the original Vazirmatn font.
 *  Chromium's print-to-PDF embeds the font and shapes RTL text correctly. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ROOT = '/home/user/raouf';
const CONV = path.join(ROOT, 'wordpress-conversion');
const DOCS = path.join(CONV, 'docs');
const DIST = path.join(CONV, 'dist');
const QA_MODULES = path.join(ROOT, '.work', 'wp-qa', 'node_modules');
fs.mkdirSync(DOCS, { recursive: true });

const font = fs.readFileSync(path.join(CONV, 'theme/raouf-academy/assets/fonts/vazirmatn-arabic-wght-normal.woff2')).toString('base64');
const latin = fs.readFileSync(path.join(CONV, 'theme/raouf-academy/assets/fonts/vazirmatn-latin-wght-normal.woff2')).toString('base64');

const themeZipSize = fs.statSync(path.join(DIST, 'raouf-academy-wordpress-theme.zip')).size;
const sizeMB = (themeZipSize / 1024 / 1024).toFixed(2);

const css = `
@font-face{font-family:'Vazirmatn';src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900;font-style:normal;font-display:block}
@font-face{font-family:'VazirmatnLatin';src:url(data:font/woff2;base64,${latin}) format('woff2');font-weight:100 900;font-style:normal;font-display:block}
@page{size:A4;margin:16mm 15mm 16mm 15mm}
*{box-sizing:border-box}
html{direction:rtl}
body{font-family:'Vazirmatn','VazirmatnLatin',Tahoma,sans-serif;font-size:10.5pt;line-height:1.95;color:#303D62;margin:0}
h1{font-size:21pt;color:#4B587F;border-bottom:3px solid #079FE5;padding-bottom:8px;margin:0 0 14px}
h2{font-size:14pt;color:#079FE5;margin:24px 0 8px;page-break-after:avoid}
h3{font-size:11.5pt;color:#303D62;margin:16px 0 5px;page-break-after:avoid}
p{margin:6px 0}
ul,ol{margin:6px 0 10px;padding-inline-start:22px}
li{margin:3px 0}
table{width:100%;border-collapse:collapse;margin:10px 0;font-size:9.3pt;page-break-inside:avoid}
th,td{border:1px solid #D9DEEA;padding:6px 8px;text-align:right;vertical-align:top}
th{background:#EAF7FF;color:#303D62;font-weight:700}
tr:nth-child(even) td{background:#FBFBFD}
code,.ltr{direction:ltr;unicode-bidi:isolate;font-family:'VazirmatnLatin',monospace;font-size:9pt;background:#F4F6FA;padding:1px 4px;border-radius:3px;display:inline-block}
code{white-space:nowrap}
.badge{display:inline-block;background:#E8F7EC;color:#1E6B37;border:1px solid #BFE3C9;border-radius:12px;padding:1px 9px;font-size:8.7pt;font-weight:700}
.warn{display:inline-block;background:#FFF6E5;color:#8A5B00;border:1px solid #F0D8A8;border-radius:12px;padding:1px 9px;font-size:8.7pt;font-weight:700}
.box{background:#F9EEFB;border-inline-start:4px solid #870B91;padding:10px 14px;margin:12px 0;border-radius:4px}
.header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #E6E7EE;padding-bottom:10px;margin-bottom:16px}
.brand{font-size:12pt;font-weight:800;color:#4B587F}
.meta{font-size:8.8pt;color:#777B89;text-align:left;direction:ltr}
.small{font-size:9pt;color:#777B89}
.page-break{page-break-before:always}
.ok{color:#1E6B37;font-weight:700}
.na{color:#8A5B00;font-weight:700}
`;

function wrap(title, subtitle, body) {
  return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>
  <div class="header"><div class="brand">آموزشگاه فنی و حرفه‌ای رئوف</div><div class="meta">Raouf Academy · WordPress 6.8.3 · 2026-11-09 UTC</div></div>
  <h1>${title}</h1><p class="small">${subtitle}</p>${body}
  <p class="small" style="margin-top:26px;border-top:1px solid #E6E7EE;padding-top:8px">این سند به‌صورت خودکار از نتایج واقعی تست‌ها تولید شده است. موارد انجامنشده با برچسب «NOT TESTED» مشخص شده‌اند.</p>
  </body></html>`;
}

/* ------------------------------------------------------- installation guide */
const guide = wrap('راهنمای نصب قالب وردپرس آموزشگاه رئوف',
  'نسخه ۱.۰.۰ — تبدیل دقیق وب‌سایت HTML/CSS/JS به قالب استاندارد وردپرس، بدون هیچ تغییر بصری.', `
<h2>۱. پیشنیازها</h2>
<table>
<tr><th>مورد</th><th>حداقل نسخه / مقدار</th><th>نسخه تستشده</th></tr>
<tr><td>وردپرس</td><td class="ltr">6.4</td><td class="ltr">6.8.3</td></tr>
<tr><td>PHP</td><td class="ltr">8.0</td><td class="ltr">8.3.36</td></tr>
<tr><td>پایگاه داده</td><td>MySQL / MariaDB (SQLite در محیط تست)</td><td>SQLite (Playground)</td></tr>
<tr><td>حداکثر اندازه آپلود</td><td>حداقل ۸ مگابایت (<code>upload_max_filesize</code> و <code>post_max_size</code>)</td><td class="ltr">64M</td></tr>
<tr><td>پیوندهای یکتا</td><td>غیر از «ساده» (ترجیحاً <code>/%postname%/</code>)</td><td class="ltr">/%postname%/</td></tr>
<tr><td>افزونه اجباری</td><td>هیچکدام</td><td>—</td></tr>
</table>
<div class="box">قالب به هیچ صفحهساز، المنتور، ووکامرس، جیپ کوئری یا کتابخانهای خارجی نیاز ندارد. تمام فونت‌ها، تصاویر، آیکون‌ها، CSS و JavaScript به‌صورت محلی در بسته قرار دارند.</div>

<h2>۲. فایل تحویلی</h2>
<p>فایل <code>raouf-academy-wordpress-theme.zip</code> (حدود ${sizeMB} مگابایت) را دریافت کنید. در ریشه ZIP تنها یک پوشه بهنام <code>raouf-academy/</code> وجود دارد و هیچ فایل توسعهای یا اضافی در آن نیست. فایل ZIP پیش از تحویل با <code>unzip -t</code> بررسی شده و سالم است.</p>

<h2>۳. نصب از طریق پیشخوان وردپرس (روش توصیهشده)</h2>
<ol>
<li>وارد پیشخوان وردپرس شوید.</li>
<li>به <b>نمایش ← پوسته‌ها ← افزودن پوسته تازه ← بارگذاری پوسته</b> بروید (<span class="ltr">Appearance → Themes → Add New → Upload Theme</span>).</li>
<li>فایل <code>raouf-academy-wordpress-theme.zip</code> را انتخاب و دکمه <b>هماکنون نصب کن</b> را بزنید.</li>
<li>پس از پیام «پوسته با موفقیت نصب شد»، دکمه <b>فعال کردن</b> را بزنید.</li>
<li>صفحه نخست سایت را باز کنید؛ وب‌سایت دقیقاً با همان ظاهر منبع اصلی نمایش داده می‌شود.</li>
</ol>
<p><span class="badge">تستشده</span> این مسیر دقیقاً روی یک نصب تازه وردپرس ۶.۸.۳ با همان فایل ZIP تحویلی اجرا شد: ۲۴/۲۴ گام موفق، پیام <span class="ltr">Theme installed successfully</span>، فعالسازی، ۱۱/۱۱ مسیر، دو منوی واقعی تخصیصیافته و ۵ اسکرینشات مستند. نتیجه در <code>qa/results/stage-F-install.json</code> موجود است.</p>

<h3>اگر محدودیت آپلود سرور کمتر از اندازه فایل است</h3>
<p>مقدار <code>upload_max_filesize</code> و <code>post_max_size</code> را در تنظیمات PHP به حداقل <code>16M</code> افزایش دهید، یا پوشه <code>raouf-academy/</code> را با FTP/SFTP در <code>wp-content/themes/</code> قرار دهید و سپس از <b>نمایش ← پوسته‌ها</b> فعال کنید.</p>

<h2>۴. آنچه هنگام فعالسازی به‌صورت خودکار انجام می‌شود</h2>
<ul>
<li>ایجاد <b>ده صفحه وردپرس</b> (خانه، دوره‌ها، چهار صفحه دوره، درباره، گالری، تماس، ثبتنام) با <code>post_content</code> دقیقاً برابر HTML منبع و قابل ویرایش از ویرایشگر وردپرس.</li>
<li>تنظیم صفحه نخست ایستا (<span class="ltr">Settings → Reading → A static page</span>) روی صفحه خانه.</li>
<li>تنظیم ساختار پیوندهای یکتا روی <code>/%postname%/</code>.</li>
<li>ایجاد و تخصیص دو منوی واقعی وردپرس: <b>منوی اصلی رئوف (هدر و موبایل)</b> و <b>منوی دوره‌های آموزشی (فوتی)</b>، قابل ویرایش از <b>نمایش ← منو‌ها</b>.</li>
<li>ثبت نوع نوشته خصوصی <code>raouf_submission</code> برای ذخیره امن درخواست‌های فرم‌ها.</li>
</ul>
<div class="box">برای جلوگیری از تکرار، صفحات و منو‌ها فقط در صورتی ساخته می‌شوند که از قبل وجود نداشته باشند. در صورت نیاز به بازسازی کامل محتوا، از <b>نمایش ← تنظیمات قالب رئوف ← همگامسازی صفحات</b> استفاده کنید.</div>

<h2>۵. ویرایش محتوا بدون دستکاری PHP</h2>
<table>
<tr><th>بخش</th><th>محل ویرایش در پیشخوان</th></tr>
<tr><td>متن و تصاویر صفحات</td><td><b>صفحات ← ویرایش</b> (محتوای اولیه دقیقاً همان HTML منبع است)</td></tr>
<tr><td>منوی هدر، منوی موبایل، لینک‌های فوتی</td><td><b>نمایش ← منو‌ها</b></td></tr>
<tr><td>نام سایت، شماره تماس، نشانی، اینستاگرام، رایانامه مدیر</td><td><b>نمایش ← تنظیمات قالب رئوف</b></td></tr>
<tr><td>جایگزینی تکتک تصاویر با فایل‌های کتابخانه رسانه</td><td><b>نمایش ← تنظیمات قالب رئوف ← تصاویر</b></td></tr>
<tr><td>مشاهده درخواست‌های ثبتنام و تماس</td><td><b>نمایش ← درخواست‌های ثبت‌شده</b></td></tr>
<tr><td>تصویر شاخص قالب / اطلاعات نسخه</td><td><code>readme.txt</code> و <code>screenshot.png</code> در پوشه قالب</td></tr>
</table>
<p>تغییر تصویر از طریق کتابخانه رسانه، URL همان تصویر را جایگزین می‌کند و سایر تصاویر و استایل‌ها دستنخورده باقی می‌مانند. مقادیر پیشفرض دقیقاً همان مقادیر رسمی منبع هستند: <span class="ltr">+98 9141 803287</span>، <span class="ltr">academi_raouf</span> و نشانی تبریز، بارون آواک.</p>

<h2>۶. فرم‌های ثبتنام و تماس</h2>
<p>دو فرم اصلی بدون تغییر در <code>app.js</code> باقی مانده‌اند و به نقاط پایانه <code>/api/registrations</code> و <code>/api/contact</code> ارسال می‌شوند. سمت سرور وردپرس:</p>
<ul>
<li>توکن CSRF دوبارارسال مبتنی بر <code>wp_create_nonce()</code> / <code>wp_verify_nonce()</code>؛</li>
<li>پاکسازی و اعتبارسنجی نام، شماره تماس (شامل ارقام فارسی)، دوره، موضوع، رایانامه و متن؛</li>
<li>فیلد honeypot، محدودیت نرخ ۸ درخواست در ۱۵ دقیقه و جلوگیری از ارسال تکراری؛</li>
<li>ذخیره واقعی در نوع نوشته خصوصی <code>raouf_submission</code> پیش از پاسخ <span class="ltr">201</span>؛ پیام موفقیت فقط پس از ذخیره موفق نمایش داده می‌شود؛</li>
<li>در صورت تنظیم رایانامه مدیر، ارسال ایمیل با <code>wp_mail()</code>؛ در غیر اینصورت درخواست‌ها صرفاً در پیشخوان ذخیره می‌شوند.</li>
</ul>
<p><span class="warn">توجه</span> ارسال ایمیل به SMTP سرور مقصد وابسته است و در محیط تست (بدون سرور ایمیل) به‌صورت سرتاسری تست نشده است؛ ذخیره در پایگاه داده و نمایش در پیشخوان تست و تأیید شده است.</p>

<h2>۷. نکات فنی و عیبیابی</h2>
<table>
<tr><th>موضوع</th><th>توضیح</th></tr>
<tr><td>عدم تداخل استایل</td><td>استایل‌های بلوک/سراسری وردپرس، ایموجی، oEmbed، نوار مدیر در نمای سایت و استایل‌های اضافه هسته حذف شده‌اند تا CSS منبع بدون رقیب بماند.</td></tr>
<tr><td>بارگذاری دارایی‌ها</td><td>یک فایل <code>style.css</code> (هدر وردپرس + همان CSS منبع) و یک <code>app.js</code> با <code>defer</code>، هرکدام دقیقاً یکبار.</td></tr>
<tr><td>فونت</td><td>سه فایل WOFF2 محلی Vazirmatn؛ فقط مسیر <code>@font-face</code> از مطلق به نسبی تغییر کرده است (ضرورت جابجایی فایل CSS به ریشه قالب).</td></tr>
<tr><td>خطای ۴۰۴ پس از نصب</td><td>یکبار <b>تنظیمات ← پیوندهای یکتا ← ذخیره تغییرات</b> را بزنید تا قوانین بازنویسی بازسازی شوند.</td></tr>
<tr><td>فونت یا تصویر بارگذاری نمی‌شود</td><td>بررسی کنید پوشه <code>wp-content/themes/raouf-academy/assets/</code> بهطور کامل منتقل شده و مجوزهای فایل‌ها قابل خواندن باشند.</td></tr>
<tr><td>نیاز به بازسازی صفحات</td><td><b>نمایش ← تنظیمات قالب رئوف ← همگامسازی صفحات با منبع</b>.</td></tr>
<tr><td>پشتیبانی از ترجمه</td><td>متندامین <code>raouf-academy</code> و فایل <code>languages/raouf-academy.pot</code>.</td></tr>
</table>

<h2>۸. موارد تستنشده در محیط تحویل</h2>
<p>موارد زیر <b>NOT TESTED</b> هستند و هیچکدام PASS گزارش نشدهاند:</p>
<ul>
<li>اجرا روی LAMP/LEMP واقعی با PHP سیستمی و MySQL/MariaDB؛ تمام تستها روی WordPress Playground (PHP‑WASM 8.3.36 + SQLite) انجام شدهاند.</li>
<li>وردپرس چندسایته، نسخههای ۶.۴ تا ۶.۷ و پس از ۶.۸.۳، PHP ۷.۴/۸.۰/۸.۱/۸.۲ بهصورت اجرایی.</li>
<li>ارسال ایمیل سرتاسری SMTP، افزونه Theme Check، PageSpeed/CDN/کش/بار سنگین، دستگاههای فیزیکی، مرورگرهای قدیمی و فناوریهای کمکی.</li>
<li>افزونهها و صفحهسازهای ثالث، ووکامرس و LMS.</li>
</ul>
<p><span class="warn">محدودیت مهاجرت:</span> تمرین تغییر دامنه روی همان نصب Playground با <code>update_option(home/siteurl)</code> و سرآیند <span class="ltr">Host</span> انجام شد، نه جابجایی واقعی پایگاهداده بین دو هاست. WPCS و PHPCompatibilityWP اجرا شدهاند، ولی نتیجهٔ استاتیک جایگزین تست اجرایی نسخههای مختلف PHP نیست.</p>
`);

/* -------------------------------------------------------- conversion report */
const report = wrap('گزارش تبدیل وب‌سایت رئوف به قالب وردپرس',
  'گزارش فنی، معماری، مقایسه بصری و نتایج واقعی تست‌ها — نسخه ۱.۰.۰، ۸ نوامبر ۲۰۲۶.', `
<h2>۱. خلاصه اجرایی</h2>
<p>وب‌سایت استاتیک آموزشگاه فنی و حرفه‌ای رئوف بدون هیچ بازطراحی، حذف یا جایگزینی بخش، به یک قالب کامل و مستقل وردپرس تبدیل شد. منبع معتبر، کد موجود در مخزن GitHub بود (نه تصاویر اسکرینشات). هر ۱۱ مسیر، DOM، کلاسها، شناسهها، CSS، JavaScript، فونت‌ها، ۶۷ تصویر، آیکون‌ها و رفتار تعاملی حفظ شدند. قالب از طریق پیشخوان وردپرس روی یک نصب تازه بارگذاری، نصب و فعال شد و مقایسه پیکسلبهپیکسل در ۶ اندازه صفحه تفاوتی نشان نداد.</p>
<p><span class="badge">انجامشده و تستشده</span> بسته نصبی، راهنمای نصب، بسته کد منبع و این گزارش همگی تولید شده‌اند.</p>

<h2>۲. بررسی منبع پیش از کدنویسی</h2>
<table>
<tr><th>مورد</th><th>نتیجه</th></tr>
<tr><td>مخزن</td><td class="ltr">hesam13871127-ai/raouf</td></tr>
<tr><td>شاخه مرجع</td><td class="ltr">arena/dfee8ce0-raouf</td></tr>
<tr><td>کامیت کامل سایت</td><td class="ltr">9ab16c7</td></tr>
<tr><td>کامیت حاوی بستههای تحویلی</td><td class="ltr">abc23ef</td></tr>
<tr><td>شاخه <span class="ltr">main</span> / <span class="ltr">33df2fa</span></td><td>ناقص؛ بهعنوان منبع رد شد</td></tr>
<tr><td>بسته مرجع</td><td><code>raouf-academy-template.zip</code> — ۱۵۵ مدخل، <span class="ltr">unzip -t</span> سالم، هش SHA‑256 فایل‌های کلیدی با مخزن یکسان</td></tr>
<tr><td>صفحات HTML</td><td>۱۱ مسیر: <code>/</code>، <code>/courses/</code>، چهار دوره، <code>/about/</code>، <code>/gallery/</code>، <code>/contact/</code>، <code>/register/</code>، <code>/404/</code></td></tr>
<tr><td>دارایی‌ها</td><td>۱ فایل CSS، ۱ فایل JS، ۳ فونت WOFF2، ۶۷ تصویر (۶۶ WebP + لوگوی JPG)، ۴۵ آیکون SVG درونخطی</td></tr>
<tr><td>وابستگی‌ها</td><td>هیچ CDN، فریمورک، jQuery، کتابخانه یا افزونهای وجود ندارد</td></tr>
<tr><td>نقاط شکست واکنشگرا</td><td class="ltr">1200 / 992 / 720 / 480 px</td></tr>
<tr><td>تعاملات</td><td>منوی کشویی، منوی موبایل، آکاردئون سؤالات متداول، فیلتر گالری، لایتپاکس با کیبورد، انیمیشنهای reveal، اعتبارسنجی و ارسال فرم‌ها، دکمه بازگشت به بالا، <code>prefers-reduced-motion</code></td></tr>
</table>
<p>نسخه استخراجشدهٔ بسته بهعنوان مرجع دستنخورده در <code>.work/wp-source/raouf-academy/</code> نگهداری شد و توسعه در پوشه مجزای <code>wordpress-conversion/</code> انجام گرفت.</p>

<h2>۳. معماری قالب</h2>
<table>
<tr><th>لایه</th><th>فایل‌ها</th></tr>
<tr><td>هدر قالب و CSS</td><td><code>style.css</code> = هدر استاندارد وردپرس + متن کامل و بدون تغییر CSS منبع (فقط ۳ مسیر فونت مطلق → نسبی)</td></tr>
<tr><td>الگو‌های سلسلهمراتب</td><td><code>front-page.php</code>، <code>page.php</code>، <code>index.php</code>، <code>single.php</code>، <code>archive.php</code>، <code>404.php</code> و ۹ الگوی اختصاصی صفحه</td></tr>
<tr><td>بخشهای مشترک</td><td><code>header.php</code>، <code>footer.php</code> با <code>wp_head()</code> / <code>wp_footer()</code> و منو‌های واقعی وردپرس</td></tr>
<tr><td>توابع و زیرساخت</td><td><code>functions.php</code> و <code>inc/</code>: helpers، options، menus، setup، forms، icons، pages-data، nav-fallback، lightbox-markup، 404-markup</td></tr>
<tr><td>دارایی‌ها</td><td><code>assets/css/</code>، <code>assets/js/app.js</code> (بایت به بایت)، <code>assets/fonts/</code> (۳)، <code>assets/images/</code> (۶۷)</td></tr>
<tr><td>بستهبندی</td><td><code>readme.txt</code>، <code>screenshot.png</code>، <code>languages/raouf-academy.pot</code> (۲۸ رشته)</td></tr>
</table>
<p>URLها و رشتههای وابسته به نصب (<span class="ltr">assets</span>، لینک‌های داخلی، نام سایت، تلفن، نشانی، اینستاگرام، سال) از طریق <code>get_template_directory_uri()</code>، <code>home_url()</code> و گزینههای قالب تولید می‌شوند؛ هیچ آدرس ثابت وابسته به دامنهای در کد باقی نمانده است. خروجی پویا با <code>esc_html</code> / <code>esc_attr</code> / <code>esc_url</code> گریز داده می‌شود، ورودی‌ها پاکسازی و با nonce بررسی می‌شوند، و همه فایل‌ها از دسترسی مستقیم محافظت دارند.</p>

<h3>نگاشت مسیر‌ها به الگو‌ها</h3>
<table>
<tr><th>مسیر</th><th>الگو</th><th>مسیر</th><th>الگو</th></tr>
<tr><td class="ltr">/</td><td>front-page.php</td><td class="ltr">/about/</td><td>page-about.php</td></tr>
<tr><td class="ltr">/courses/</td><td>page-courses.php</td><td class="ltr">/gallery/</td><td>page-gallery.php</td></tr>
<tr><td class="ltr">/courses/skin-facial/</td><td>page-skin-facial.php</td><td class="ltr">/contact/</td><td>page-contact.php</td></tr>
<tr><td class="ltr">/courses/medical-emergency/</td><td>page-medical-emergency.php</td><td class="ltr">/register/</td><td>page-register.php</td></tr>
<tr><td class="ltr">/courses/pharmacy-technician/</td><td>page-pharmacy-technician.php</td><td class="ltr">/404/</td><td>404.php</td></tr>
<tr><td class="ltr">/courses/massage-relaxation/</td><td>page-massage-relaxation.php</td><td>سایر</td><td>index.php / page.php</td></tr>
</table>

<h2>۴. یکپارچگی بصری و ساختاری</h2>
<p>دو سایت به‌صورت همزمان اجرا شدند: نسخه اصلی روی سرور Node و نسخه وردپرس روی WordPress Playground. خروجی HTML هر ۱۱ مسیر نرمالسازی و مقایسه شد؛ سپس با Chromium واقعی، از هر ۱۱ مسیر در ۶ اندازه صفحه عکس تمامصفحه گرفته و با <span class="ltr">ImageMagick compare -metric AE</span> مقایسه شد.</p>
<table>
<tr><th>آزمون</th><th>نتیجه</th></tr>
<tr><td>مقایسه DOM هدر + محتوا + فوتی (۱۱ مسیر، دو نصب مجزا)</td><td class="ok">همه یکسان (۱۱/۱۱ در هر نصب)</td></tr>
<tr><td>مقایسه <code>&lt;main&gt;</code> بایتبهبایت پس از نرمالسازی URL</td><td class="ok">۱۱/۱۱ یکسان</td></tr>
<tr><td>جفت عکسها: ۱۱ مسیر × ۶ اندازه = ۶۶ جفت (۶۰ جفت الزامی + ۶ جفت ۴۰۴)</td><td class="ok">همگی JPEG با <span class="ltr">AE = 0</span> و <span class="ltr">RMSE = 0</span>، ابعاد برابر؛ ۶۰/۶۰ جفت الزامی</td></tr>
<tr><td>تصاویر شکسته / لینک خالی / سرریز افقی / reveal پنهان</td><td class="ok">صفر در تمام نما‌ها</td></tr>
<tr><td>خطاهای کنسول مرورگر در عکسبرداریها</td><td class="ok">فقط ۶ پیام مربوط به وضعیت ۴۰۴ عمدی مسیر <code>/404/</code>؛ خطای دارایی یا جاوااسکریپت قالب صفر</td></tr>
<tr><td>اندازه‌ها</td><td class="ltr">1920×1080، 1366×768، 1024×768، 768×1024، 390×844، 360×800</td></tr>
</table>
<div class="box">در نخستین اجرا ۵ جفت تفاوت بسیار جزئی دیده شد که بررسی بصری نشان داد ناشی از دیکد نشدن تصاویر <span class="ltr">loading="lazy"</span> در لحظه عکسبرداری است (نه اختلاف قالب). با انتظار تا تکمیل همه تصاویر و انیمیشنها، همان ۵ جفت دوباره گرفته شد و همگی <span class="ltr">AE = 0</span> شدند.</div>

<h2>۵. نتایج تست‌های عملکردی</h2>
<table>
<tr><th>گروه تست</th><th>تعداد</th><th>نتیجه</th></tr>
<tr><td>نصب و فعالسازی از طریق <b>نمایش ← پوسته‌ها ← بارگذاری</b> روی وردپرس تازه</td><td>۲۴ گام</td><td class="ok">۲۴/۲۴ موفق؛ ۱۱/۱۱ مسیر، منوهای واقعی، ۵ اسکرین‌شات</td></tr>
<tr><td>بارگذاری ۱۲ مسیر (شامل ۴۰۴) + بررسی خطاهای PHP</td><td>۱۲</td><td class="ok">کدهای صحیح، بدون Warning/Notice/Fatal</td></tr>
<tr><td>تکبار بودن بارگذاری CSS و JS</td><td>۱۲</td><td class="ok">هر صفحه دقیقاً ۱ استایل و ۱ اسکریپت</td></tr>
<tr><td>لینت ۲۸ فایل PHP</td><td>۲۸</td><td class="ok">بدون خطای نحوی (PHP 8.5.12 CLI و اجرای 8.3.36)</td></tr>
<tr><td>تعاملات مرورگر (منو، آکاردئون، لایتپاکس، فیلتر، موبایل، RTL، فرم‌ها، لینک‌ها)</td><td>۲۸</td><td class="ok">۲۸/۲۸ موفق، ۰ خطای کنسول</td></tr>
<tr><td>نقاط پایانه فرمها (CSRF، honeypot، اعتبار، تکرار، نرخ، ارقام فارسی، ایمیل اختیاری، XSS/SQL، ذخیره و نمایش امن در پیشخوان)</td><td>۲۳ بررسی + ۹ فراخوان HTTP + ۸ فراخوان گروه a</td><td class="ok">۲۳/۲۳، ۹/۹ و ۸/۸؛ همه کدهای وضعیت مورد انتظار</td></tr>
<tr><td>پیشخوان: داشبورد، صفحات، منوها، پوستهها، تنظیمات قالب، درخواستها، تنظیمات خواندن، کتابخانه رسانه + امنیت</td><td>۸ بخش + ۲۴ بررسی امنیتی + ۱۰ بررسی تکمیلی</td><td class="ok">همه ۲۰۰؛ ۲۴/۲۴ و ۱۰/۱۰؛ رکوردهای فرم در پیشخوان قابل مشاهده</td></tr>
<tr><td>قابل ویرایش بودن <code>post_content</code> صفحات</td><td>۱</td><td class="ok">ویرایشگر و REST محتوای دقیق منبع را نشان دادند</td></tr>
</table>
<h3>نتایج تکمیلی مرحلهٔ F</h3>
<table>
<tr><th>گروه تست</th><th>نتیجه</th></tr>
<tr><td>لینکها و داراییها: ۱۰۳ فایل قالب، ۳۲۵ لینک داخلی، توکنهای افشاشده، خطاهای PHP</td><td class="ok">۷/۷؛ ۷۵ دارایی غیرPHP بایتبهبایت، ۲۸ فایل PHP بدون افشای سورس، ۰ لینک شکسته/خارجی ناشناخته/توکن/خطا</td></tr>
<tr><td>مهاجرت دامنه: <code>home</code>/<code>siteurl</code> به <code>http://raouf-academy.example</code>، لینکها/تصاویر/فونتها/فرمها/تنظیمات</td><td class="ok">۱۰/۱۰؛ ۱۰ صفحه، ۵۰۰ توکن قابلحمل، ۰ هاست ثابت، ۱۱/۱۱ HTML همسان، ۳۱۹ لینک سالم</td></tr>
<tr><td>امنیت خروجی و WPCS (PHPCS 3.13.6 / WPCS 3.2.0 / PHPCompatibilityWP)</td><td class="ok">۱۲۱ خطا + ۱۸۱ هشدار صرفاً سبکی، ۰ یافتهٔ امنیتی؛ سازگاری استاتیک PHP 8.0+ بدون خطا؛ لینت ۲۸/۲۸</td></tr>
<tr><td>ممیزی مرورگر: عملکرد، دسترسپذیری (axe-core 4.10.3)، خطاهای کنسول</td><td class="ok">۲۲ نما؛ ۰ تصویر شکسته، ۰ تصویر بدون <code>alt</code>، ۲۰۰ تصویر تنبل، ۰ منبع خارجی، ۰ خطای PHP/صفحهای؛ ۱ نوع یافتهٔ کنتراست رنگ</td></tr>
</table>
<p><span class="warn">موارد ثبتشده و بدون تغییر (به دلیل الزام حفظ ظاهر):</span> یافتهٔ <span class="ltr">color-contrast</span> در ۱۱۶ گره / ۲۲ نما از طراحی مرجع و همان فایل CSS اصلی به ارث رسیده است و اصلاح آن مستلزم تغییر رنگ و نقض یکسانی بصری است؛ بنابراین تغییر داده نشد. چهار تصویر بزرگتر از ۲۰۰ کیلوبایت، نبود <span class="ltr">CDN</span>/سرآیند کش و نبود <span class="ltr">fetchpriority</span> نیز بهعنوان گزینههای بهینهسازی آینده ثبت شدند و تغییری ایجاد نکردند. تنها خطاهای کنسول، پاسخ ۴۰۴ عمدی مسیر <code>/404/</code> و آواتارهای خارجی هسته در پیشخواناند.</p>
<p><span class="warn">خطاهای محیطی</span> هنگام تست پیشخوان، ۸ درخواست آواتار <span class="ltr">secure.gravatar.com</span> بهدلیل محدودیت شبکه sandbox با <span class="ltr">ERR_CONNECTION_CLOSED</span> شکست خورد؛ اینها داراییهای خارجی هسته وردپرس در صفحات مدیریت هستند، نه فایلهای قالب یا نمای سایت. در تستهای نمای سایت بهجز ۴۰۴ عمدی <code>/404/</code> هیچ خطای کنسولی ثبت نشد.</p>

<h2>۶. خطاهای یافتهشده و اصلاحشده</h2>
<table>
<tr><th>#</th><th>مشکل</th><th>اصلاح</th></tr>
<tr><td>۱</td><td>خطای نحوی <code>footer.php</code> بهدلیل قرار گرفتن <code>&lt;?php</code> درون بستر PHP باز</td><td>تولید <code>wp_footer(); ?&gt;</code>؛ لینت مجدد همهٔ فایل‌ها پاک شد</td></tr>
<tr><td>۲</td><td><code>preg_replace</code> با الگوی <code>\\u{200F}</code> در PCRE2 نامعتبر بود و شماره تماس را خالی می‌کرد</td><td>جایگزینی با <code>\\x{200C}\\x{200F}</code>؛ تست شماره فارسی و لاتین موفق شد</td></tr>
<tr><td>۳</td><td><code>sanitize_email()</code> رایانامه بدشکل (<code>bad@@</code>) را بیتوجه می‌پذیرفت</td><td>اعتبارسنجی رشته خام با همان الگوی <code>app.js</code> پیش از پاکسازی</td></tr>
<tr><td>۴</td><td>منوی وردپرس در صفحات جزئیات دوره، والد «دوره‌ها» را فعال می‌کرد</td><td>جدا کردن «فعال بودن دقیق URL» از «باز بودن کشوی موبایل در بخش دوره‌ها»</td></tr>
<tr><td>۵</td><td>یک فاصله اضافه در <code>&lt;details class="mobile-sub" &gt;</code> منبع</td><td>تولید دقیق همان فاصله برای یکسانی بایتبهبایت</td></tr>
<tr><td>۶</td><td>هسته وردپرس استایل <code>contain-intrinsic-size</code>، اسکریپت speculation rules، نوار مدیر و shortlink اضافه می‌کرد</td><td>حذف اکشن‌های مربوطه و غیرفعالسازی نوار مدیر در نمای سایت</td></tr>
</table>

<div class="box"><b>نتیجهٔ مرحلهٔ F (تست نهایی):</b> ممیزی مستقل مرحلهٔ A سیزده نقص (D01–D13) یافت که در مرحلهٔ B اصلاح و مستند شدند؛ شش اصلاح امنیتی SD-01–SD-06 در مرحلهٔ D-1 با ۷۳/۷۳ PASS و بدون رگرسیون تأیید شد. در مرحلهٔ F، همان بستهٔ ZIP روی نصب تازه بارگذاری و فعال شد (۲۴/۲۴)، ۶۶/۶۶ مقایسهٔ تصویری دسکتاپ/موبایل اختلاف پیکسلی صفر، ۲۸/۲۸ تعامل، ۱۱/۱۱ ساختار و ۱۱/۱۱ DOM، ۳۲۵ لینک بدون شکستگی، ۲۳/۲۳ فرم، ۲۴/۲۴ امنیت و ۱۰/۱۰ امنیت تکمیلی، ۱۰/۱۰ مهاجرت دامنه، ۲۸/۲۸ لینت PHP و صفر خطای PHP/جاوااسکریپت بحرانی ثبت شد. هیچ تغییری در فایلهای اجرایی قالب پس از نصب آزمایشی داده نشد؛ بستهٔ تحویلی دقیقاً همان نسخهٔ آزمودهشده است.</div>
<h2>۷. موارد NOT TESTED (به‌صورت صادقانه)</h2>
<ul>
<li>اجرا روی سرور LAMP/LEMP با PHP سیستمی و MySQL/MariaDB واقعی؛ تست‌ها روی WordPress Playground (PHP‑WASM 8.3.36 + SQLite) انجام شده‌اند.</li>
<li>وردپرس چندسایته، نسخههای ۶.۴ تا ۶.۷ و نسخههای پس از ۶.۸.۳، و PHP ۷.۴.</li>
<li>ارسال ایمیل سرتاسری با SMTP (بدون سرور ایمیل در محیط تست)؛ تحویل رایانامه مدیر وابسته به پیکربندی سرور مقصد است.</li>
<li>ابزار خودکار Theme Check؛ WPCS و PHPCompatibilityWP اجرا شدند، ولی نتیجهٔ سازگاری استاتیک جایگزین اجرای واقعی روی نسخههای مختلف PHP نیست. PHP ۸.۰/۸.۱/۸.۲ و ۷.۴ بهصورت اجرایی تست نشد.</li>
<li>دستگاههای موبایل فیزیکی، مرورگرهای قدیمی و Internet Explorer؛ تست موبایل با شبیهسازی Chromium در ۳۸/۷۶/۳۶۰ و ۳۹۰ پیکسل انجام شد.</li>
<li>سازگاری با افزونههای ثالث، صفحه‌سازها و ووکامرس (طبق خواسته پروژه، نیازی به آنها نیست).</li>
<li>PageSpeed Insights، Lighthouse، کش/CDN، بار سنگین همزمان، SMTP، فناوریهای کمکی و مرورگرهای قدیمی. ممیزی عملکرد و <span class="ltr">axe-core</span> فقط در Chromium شبیهسازیشده اجرا شد.</li>
</ul>

<h2>۸. قابلیتهای آموزشی اختیاری (پیشنهاد آینده، پیادهمسازی نشده)</h2>
<p>طبق محدوده پروژه هیچ قابلیت آموزشی جدید، حساب دانشجو، ثبتنام دوره شبیهسازیشده، ووکامرس یا ساختار پایگاه داده اضافهای ایجاد نشد. در صورت تمایل می‌توان در فاز جداگانهای بررسی کرد: مدیریت دوره‌ها بهعنوان نوع نوشته اختصاصی، ظرفیت و برنامه کلاسها، گواهی پایان دوره، پرداخت و ثبتنام آنلاین، و پنل مدرس. این موارد صرفاً پیشنهاداند و هیچکدام تست یا پیادهمسازی نشده‌اند.</p>

<h2>۹. فایل‌های تحویلی</h2>
<table>
<tr><th>فایل</th><th>محتوا</th></tr>
<tr><td><code>raouf-academy-wordpress-theme.zip</code></td><td>قالب قابل نصب؛ پوشه <code>raouf-academy/</code> در ریشه ZIP، ۱۰۳ مدخل، ۲۸ فایل PHP، ۶۷ تصویر، ۳ فونت، ${sizeMB} مگابایت، سالم</td></tr>
<tr><td><code>installation-guide-fa.pdf</code></td><td>راهنمای نصب و پیکربندی فارسی</td></tr>
<tr><td><code>conversion-report.pdf</code></td><td>همین گزارش</td></tr>
<tr><td><code>source-code.zip</code></td><td>کد منبع قالب، مبدل، اسکریپت‌های QA و مستندات</td></tr>
</table>
<p class="small">مستندات Markdown و JSON نتایج تست‌ها نیز در <code>wordpress-conversion/docs/</code> و <code>wordpress-conversion/qa/results/</code> موجود‌اند.</p>
`);

/* ------------------------------------------------------------------ render */
const require = createRequire(path.join(QA_MODULES, 'noop.js'));
const chromiumModule = await import(pathToFileURL(path.join(QA_MODULES, '@sparticuz/chromium/build/index.js')).href);
const chromium = chromiumModule.default;
const puppeteer = require('puppeteer-core');
await chromiumModule.inflate(path.join(QA_MODULES, '@sparticuz/chromium/bin/al2023.tar.br'));
chromiumModule.setupLambdaEnvironment('/tmp/al2023/lib');
chromium.setGraphicsMode = false;
const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: 'shell' });

for (const [name, html] of [['installation-guide-fa.pdf', guide], ['conversion-report.pdf', report]]) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 1400, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.evaluate(async () => { await document.fonts.ready; });
  await new Promise((r) => setTimeout(r, 600));
  const out = path.join(DOCS, name);
  await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
  console.log(name, fs.statSync(out).size, 'bytes');
  // copy to dist as well
  fs.copyFileSync(out, path.join(DIST, name));
  await page.close();
}
await browser.close();
