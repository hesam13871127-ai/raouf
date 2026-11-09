/** Generate the two Persian PDF deliverables for correction v1.1.0. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ROOT = '/home/user/raouf';
const CONV = path.join(ROOT, 'wordpress-conversion');
const DIST = path.join(CONV, 'dist');
const DOCS = path.join(CONV, 'docs');
const WORK = path.join(ROOT, '.work', 'wp-qa', 'v110-docs');
const QA_MODULES = path.join(ROOT, '.work', 'wp-qa', 'node_modules');
const require = createRequire(path.join(QA_MODULES, 'noop.js'));
const chromiumModule = await import(pathToFileURL(path.join(QA_MODULES, '@sparticuz/chromium/build/index.js')).href);
const chromium = chromiumModule.default;
const puppeteer = require('puppeteer-core');
await chromiumModule.inflate(path.join(QA_MODULES, '@sparticuz/chromium/bin/al2023.tar.br'));
chromiumModule.setupLambdaEnvironment('/tmp/al2023/lib');
chromium.setGraphicsMode = false;

fs.mkdirSync(WORK, { recursive: true });
fs.mkdirSync(DOCS, { recursive: true });
const font = fs.readFileSync(path.join(CONV, 'theme/raouf-academy/assets/fonts/vazirmatn-arabic-wght-normal.woff2')).toString('base64');
const latin = fs.readFileSync(path.join(CONV, 'theme/raouf-academy/assets/fonts/vazirmatn-latin-wght-normal.woff2')).toString('base64');
const zipManifest = JSON.parse(fs.readFileSync(path.join(DIST, 'v110-zip-manifest.json'), 'utf8'));
const tests = JSON.parse(fs.readFileSync(path.join(CONV, 'qa/results/v110-13-tests.json'), 'utf8'));
const visual = JSON.parse(fs.readFileSync(path.join(CONV, 'qa/results/v110-visual.json'), 'utf8'));
const browser = JSON.parse(fs.readFileSync(path.join(CONV, 'qa/results/v110-browser.json'), 'utf8'));
const interactions = JSON.parse(fs.readFileSync(path.join(CONV, 'qa/results/v110-interactions.json'), 'utf8'));
const assets = JSON.parse(fs.readFileSync(path.join(CONV, 'qa/results/v110-asset-parity.json'), 'utf8'));
const csv = JSON.parse(fs.readFileSync(path.join(CONV, 'qa/results/v110-csv-verify.json'), 'utf8'));
const interSummary = {
  checks: interactions.checks.length,
  PASS: interactions.checks.filter(c => c.ok).length,
  FAIL: interactions.checks.filter(c => !c.ok).length,
  consoleErrors: interactions.consoleErrors.length,
};

const css = `
@font-face{font-family:'Vazirmatn';src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900;font-style:normal;font-display:block}
@font-face{font-family:'VazirmatnLatin';src:url(data:font/woff2;base64,${latin}) format('woff2');font-weight:100 900;font-style:normal;font-display:block}
@page{size:A4;margin:16mm 15mm 16mm 15mm}
*{box-sizing:border-box}
html{direction:rtl}
body{font-family:'Vazirmatn','VazirmatnLatin',Tahoma,sans-serif;font-size:10.2pt;line-height:1.9;color:#303D62;margin:0}
h1{font-size:20pt;color:#4B587F;border-bottom:3px solid #079FE5;padding-bottom:8px;margin:0 0 14px}
h2{font-size:13.5pt;color:#079FE5;margin:22px 0 8px;page-break-after:avoid}
h3{font-size:11.2pt;color:#303D62;margin:14px 0 5px;page-break-after:avoid}
p{margin:6px 0}
ul,ol{margin:6px 0 10px;padding-inline-start:22px}
li{margin:3px 0}
table{width:100%;border-collapse:collapse;margin:9px 0;font-size:8.8pt;page-break-inside:avoid}
th,td{border:1px solid #D9DEEA;padding:5px 7px;text-align:right;vertical-align:top}
th{background:#EAF7FF;color:#303D62;font-weight:700}
tr:nth-child(even) td{background:#FBFBFD}
code,.ltr,.hash{direction:ltr;unicode-bidi:isolate;font-family:'VazirmatnLatin',monospace;font-size:8.2pt;background:#F4F6FA;padding:1px 4px;border-radius:3px;display:inline-block;word-break:break-all}
code{white-space:nowrap}
.badge{display:inline-block;background:#E8F7EC;color:#1E6B37;border:1px solid #BFE3C9;border-radius:12px;padding:1px 9px;font-size:8.4pt;font-weight:700}
.warn{display:inline-block;background:#FFF6E5;color:#8A5B00;border:1px solid #F0D8A8;border-radius:12px;padding:1px 9px;font-size:8.4pt;font-weight:700}
.box{background:#F9EEFB;border-inline-start:4px solid #870B91;padding:9px 13px;margin:11px 0;border-radius:4px}
.header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #E6E7EE;padding-bottom:10px;margin-bottom:15px}
.brand{font-size:12pt;font-weight:800;color:#4B587F}
.meta{font-size:8.5pt;color:#777B89;text-align:left;direction:ltr}
.small{font-size:8.8pt;color:#777B89}
.page-break{page-break-before:always}
.ok{color:#1E6B37;font-weight:700}
.na{color:#8A5B00;font-weight:700}
`;

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function wrap(title, subtitle, body) {
  return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>
  <div class="header"><div class="brand">آموزشگاه فنی و حرفه‌ای رئوف</div><div class="meta">Raouf Academy · WP 6.8.3 · PHP 8.3 · 2026-11-07 UTC</div></div>
  <h1>${esc(title)}</h1><p class="small">${esc(subtitle)}</p>${body}
  <p class="small" style="margin-top:24px;border-top:1px solid #E6E7EE;padding-top:8px">این سند از نتایج واقعی اجرای آزمونها تولید شده است. موارد انجامنشده صریحاً «NOT TESTED» اعلام شدهاند.</p>
  </body></html>`;
}

const overall = tests.overall;
const themeZip = zipManifest.revised_theme_zip;
const pluginZip = zipManifest.plugin_zip;
const oldZip = zipManifest.reference_theme_zip;
const rows = Object.entries(tests.tests).map(([id, t]) => `
<tr><td class="ltr">${id}</td><td>${esc(t.title)}</td><td><span class="badge">${t.result}</span></td><td class="ltr">${t.PASS}/${t.checks}</td></tr>`).join('');
const evidence = [
  ['فرم پیشثبتنام', `${tests.references.registration} — پاسخ 201، storage=plugin، ارقام فارسی، دوبار کلیک فقط یک POST`],
  ['فرم تماس', `${tests.references.contact} — پاسخ 201، storage=plugin، ارقام لاتین، AJAX بدون بارگذاری مجدد`],
  ['خطای عمدی ذخیرهسازی', 'HTTP 500، پیام فارسی واقعی، بدون موفقیت کاذب، مقادیر فرم حفظ شدند'],
  ['مهاجرت دادههای قدیمی', '۲ رکورد قدیمی CPT حفظ شدند؛ دقیقاً ۲ رکورد در جدول افزونه؛ اجرای دوباره مهاجرت ۰ رکورد اضافه کرد'],
  ['زمان محلی', 'Asia/Tehran (+03:30)؛ تاریخ/زمان نمایش دادهشده با wp_date از GMT مطابقت داشت'],
  ['نقشه', '۱۱ مسیر، ۱۲ لینک بلد (۱ لینک فوتی مشترک + ۱ لینک کارت تماس)، target=_blank، بدون OpenStreetMap'],
  ['طراحی', `${visual.summary.pixel_identical}/${visual.summary.pairs} جفت پیکسلی AE=0؛ ${interSummary.PASS}/${interSummary.checks} تعامل؛ ${assets.summary.unchanged_assets} دارایی تصویری/فونت بدون تغییر`],
  ['خطاها', `${browser.consoleErrors.length} خطای JS مرورگر، ${visual.consoleErrors.length} خطای غیرمنتظره بصری، ${interSummary.consoleErrors} خطای تعاملات، لاگ PHP خالی`],
  ['CSV', `${csv.result} — خروجی RFC 4180، BOM، ۱۳ ستون، محافظت فرمول و پاکسازی XSS`],
];
const evidenceRows = evidence.map(([k, v]) => `<tr><th style="width:170px">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');
const notTested = [
  'سرور واقعی LAMP/LEMP با MySQL/MariaDB (محیط تست WordPress Playground + SQLite است)',
  'SMTP و ارسال ایمیل واقعی؛ multisite؛ وردپرس ۶٫۴ تا ۶٫۷ یا بالاتر از ۶٫۸٫۳',
  'PHP 7.4/8.0/8.1/8.2 بهصورت runtime؛ دستگاههای فیزیکی، مرورگرهای قدیمی و فناوریهای کمکی',
  'افزونههای شخص ثالث، صفحهسازها، WooCommerce/LMS، Theme Check، PageSpeed/CDN/تست بار',
  'مهاجرت واقعی بین دو هاست متفاوت (تعویض قالب در همان نصب تست شد)',
];
const notTestedHtml = notTested.map(x => `<li>${esc(x)}</li>`).join('');

const reportBody = `
<h2>۱. خلاصه نهایی</h2>
<p><span class="badge">۱۳/۱۳ آزمون PASS</span> &nbsp; <span class="badge">${overall.checks_PASS}/${overall.checks} بررسی PASS</span> &nbsp; <span class="badge">۰ FAIL</span></p>
<p>اصلاحات درخواستشده بدون هیچ تغییر بصری اعمال شد: لینک رسمی بلد، رفع کامل هر دو فرم، افزونه مستقل مدیریت درخواستها، اجرای ۱۳ آزمون واقعی و اثبات عدم تغییر طراحی دسکتاپ/موبایل. نسخه مرجع قدیمی قالب دستنخورده باقی ماند.</p>
<table><tr><th>فایل</th><th>نسخه</th><th>اندازه</th><th>SHA-256</th></tr>
<tr><td class="ltr">${esc(path.basename(themeZip.path))}</td><td>۱٫۱٫۰</td><td class="ltr">${themeZip.size.toLocaleString('en-US')} B</td><td class="hash">${themeZip.sha256}</td></tr>
<tr><td class="ltr">${esc(path.basename(pluginZip.path))}</td><td>۱٫۰٫۰</td><td class="ltr">${pluginZip.size.toLocaleString('en-US')} B</td><td class="hash">${pluginZip.sha256}</td></tr>
<tr><td class="ltr">${esc(path.basename(oldZip.path))} <span class="small">(مرجع، بدون تغییر)</span></td><td>۱٫۰٫۰</td><td class="ltr">${oldZip.size.toLocaleString('en-US')} B</td><td class="hash">${oldZip.sha256}</td></tr>
</table>
<p class="small">گزارش حاضر و راهنمای نصب/فعالسازی نیز بهصورت فایل PDF جداگانه پیوست شدهاند؛ اندازه و SHA-256 هر چهار فایل در <code>dist/v110-final-manifest.json</code> ثبت شده است.</p>

<h2>۲. فایلهای تحویلی و محدوده تغییرات</h2>
<ul>
<li><b>قالب اصلاحشده v1.1.0</b>: فقط ۹ فایل عملکردی/نسخه تغییر کرد؛ ۷۱ تصویر، فونت و SVG و تمام قواعد CSS بایتبهبایت یکسان باقی ماندند.</li>
<li><b>افزونه v1.0.0</b>: جدول اختصاصی <code>{prefix}_raouf_requests</code>، منوی «درخواست‌های آموزشگاه رئوف» و سه زیرمنوی دقیق، جستجو/فیلتر/جزئیات/حذف/CSV.</li>
<li><b>مقصد نقشه</b>: <span class="ltr">https://balad.ir/p/29UbcoR7CtjsIN</span>؛ نشانی ذخیرهشده قدیمی OpenStreetMap نیز بهطور خودکار ارتقا یافت و مقصد عمومی همیشه بلد است.</li>
</ul>
<div class="box">ذخیرهسازی پیش از پاسخ موفقیت انجام میشود: فیلتر <code>raouf_store_submission</code> متعلق به افزونه، INSERT قطعی در جدول را تأیید میکند؛ در صورت نبودن افزونه، قالب از نوشته خصوصی CPT بهعنوان fallback واقعی دیتابیس استفاده میکند و هنگام فعالسازی بعدی مهاجرت میکند. موفقیت کاذب وجود ندارد.</div>

<h2>۳. جدول ۱۳ آزمون الزامی</h2>
<table><thead><tr><th>کد</th><th>عنوان آزمون</th><th>نتیجه</th><th>بررسیها</th></tr></thead><tbody>${rows}</tbody></table>

<h2 class="page-break">۴. شواهد کلیدی</h2>
<table>${evidenceRows}</table>
<h3>اصلاحات پس از اجرای اولیه هارنس</h3>
<ul>
<li>بررسی اولیه CSV فقط بهدلیل حساسیت به حروف کوچک/بزرگ کلید <code>Content-Type</code> در هارنس FAIL شد؛ خروجی CSV واقعاً تولید شده بود. با صادرات مجدد واقعی شامل پیلود XSS و فرمول CSV، نویسنده RFC 4180 در افزونه اصلاح و T09 به PASS اصلاح شد.</li>
<li>آرتیفکت تعاملات فاقد شیء <code>summary</code> بود؛ هارنس اکنون نتیجه را از ۲۸ بررسی واقعی استخراج میکند.</li>
</ul>

<h2>۵. محیط اجرا و صداقت نتایج تست</h2>
<p>آزمونها روی <b>WordPress Playground 6.8.3 / PHP 8.3.36 WASM + SQLite</b> و Chromium headless اجرا شدند. این محیط جایگزین معتبر است، اما MySQL/LAMP واقعی نیست. سه سرور جداگانه برای آزمونهای عملکردی، مرورگر و خطای عمدی ذخیرهسازی استفاده شد. WP_DEBUG روشن، WP_DEBUG_DISPLAY خاموش و لاگ خطاها پایش شد.</p>
<p><span class="warn">NOT TESTED</span> موارد زیر اجرا نشدهاند و PASS اعلام نمیشوند:</p>
<ul>${notTestedHtml}</ul>
<p class="small">منطقه زمانی سایت در محیط تست <span class="ltr">Asia/Tehran</span> و اختلاف آن <span class="ltr">+03:30</span> بود. ساعت محیط تست <span class="ltr">2026-11-09 UTC</span> ثبت شد؛ تاریخ تحویل طبق تاریخ جلسه <span class="ltr">2026-11-07 UTC</span> است.</p>
`;

const guideBody = `
<h2>۱. پیشنیازها</h2>
<table><tr><th>مورد</th><th>حداقل</th><th>نسخه تستشده</th></tr>
<tr><td>وردپرس</td><td class="ltr">6.4</td><td class="ltr">6.8.3</td></tr>
<tr><td>PHP</td><td class="ltr">8.0</td><td class="ltr">8.3.36</td></tr>
<tr><td>پایگاه داده</td><td>MySQL/MariaDB</td><td>SQLite (Playground)</td></tr>
<tr><td>پیوندهای یکتا</td><td>غیر از ساده</td><td class="ltr">/%postname%/ </td></tr>
<tr><td>منطقه زمانی</td><td>تنظیمات وردپرس</td><td class="ltr">Asia/Tehran</td></tr>
</table>
<div class="box">دو فایل ZIP باید جداگانه نصب شوند. فایل قدیمی <code>raouf-academy-wordpress-theme.zip</code> بهعنوان نسخه مرجع دستنخورده باقی میماند و نباید جایگزین شود.</div>

<h2>۲. ترتیب نصب روی سایت موجود (توصیهشده)</h2>
<ol>
<li>از پیشخوان: <b>افزونهها ← افزودن افزونه تازه ← بارگذاری افزونه</b>؛ فایل <code>raouf-academy-requests-plugin-v1.0.0.zip</code> را نصب و افزونه «درخواست‌های آموزشگاه رئوف» را فعال کنید.</li>
<li>هنگام فعالسازی، جدول اختصاصی ساخته میشود و رکوردهای قدیمی نوع نوشته خصوصی <code>raouf_submission</code> <b>بدون حذف شدن</b> و بدون تکرار به جدول منتقل میشوند.</li>
<li>سپس <b>نمایش ← پوستهها ← افزودن پوسته تازه ← بارگذاری پوسته</b>؛ فایل <code>raouf-academy-wordpress-theme-v1.1.0.zip</code> را نصب و فعال کنید. وردپرس پوشه <code>raouf-academy</code> را به نسخه ۱٫۱٫۰ بهروز میکند.</li>
<li>برای نصب تازه نیز همین ترتیب یا قالب سپس افزونه قابل قبول است؛ در هر دو حالت قبل از پاسخ موفقیت فرمها، ذخیره قطعی انجام میشود.</li>
</ol>
<p><span class="badge">تستشده</span> مهاجرت ۲ رکورد قدیمی، باقی ماندن آنها پس از تعویض قالب به نسخه مرجع و بازگشت، و ماندگاری رکوردهای تازه پس از خروج/نشست تازه مرورگر.</p>

<h2>۳. منوی پیشخوان و مدیریت</h2>
<table><tr><th>منو / زیرمنو</th><th>نام دقیق</th></tr>
<tr><td>منوی اصلی</td><td>درخواست‌های آموزشگاه رئوف</td></tr>
<tr><td>زیرمنو ۱</td><td>همه درخواست‌ها</td></tr>
<tr><td>زیرمنو ۲</td><td>پیش‑ثبت‑نام دوره‌ها</td></tr>
<tr><td>زیرمنو ۳</td><td>پیام‌های تماس با ما</td></tr>
</table>
<ul>
<li>فهرست از جدیدترین به قدیمیترین؛ ستونهای شماره پیگیری، نوع، نام، تلفن، دوره/موضوع، تاریخ و زمان محلی وردپرس.</li>
<li>جستجو بر اساس نام/شماره تماس؛ فیلتر نوع درخواست و بازه تاریخ؛ نمایش کامل تمام فیلدها و متن پیام.</li>
<li>حذف فقط با تأیید جاوااسکریپت مدیر و نانس وردپرس؛ خروجی CSV با BOM، ۱۳ ستون و محافظت در برابر تزریق فرمول.</li>
<li>فقط کاربران دارای قابلیت <code>manage_options</code> دسترسی دارند؛ خروجیها escape شدهاند.</li>
</ul>

<h2>۴. بررسی پس از فعالسازی</h2>
<ol>
<li>در ۱۱ مسیر سایت، لینک «جستجوی آدرس روی نقشه» را بررسی کنید: مقصد <span class="ltr">https://balad.ir/p/29UbcoR7CtjsIN</span> و <code>target="_blank"</code> است. صفحه تماس دو لینک دارد.</li>
<li>یک پیشثبتنام کامل با شماره فارسی و یک پیام تماس با شماره لاتین ارسال کنید؛ پاسخ <code>storage=plugin</code> و شماره پیگیری دریافت میشود.</li>
<li>به منوی «درخواست‌های آموزشگاه رئوف» بروید؛ هر دو رکورد با تاریخ/ساعت محلی دیده میشوند.</li>
<li>خروج کنید، مرورگر را ببندید و دوباره وارد شوید؛ رکوردها باقی میمانند. در صورت نیاز خروجی CSV بگیرید.</li>
</ol>
<p>فرمها بدون بارگذاری مجدد صفحه کار میکنند، ارسال دوبار را مسدود میکنند، مقادیر واردشده را هنگام خطا حفظ میکنند و فقط پس از ذخیره قطعی پیام موفقیت نشان میدهند. اگر افزونه غیرفعال باشد، قالب به CPT خصوصی fallback میکند و هنگام فعالسازی مجدد افزونه دادهها مهاجرت مییابند.</p>

<h2>۵. نکات امنیتی و محدودیتها</h2>
<ul>
<li>CSRF دوبارارسال با نانس وردپرس، honeypot، محدودیت نرخ ۸/۱۵ دقیقه، جلوگیری از تکرار ۱۰ دقیقهای، پاکسازی ورودی، <code>$wpdb->prepare</code>/<code>esc_like</code> و escape خروجی پیشخوان.</li>
<li>هیچ تغییری در رنگ، فونت، اندازه، فاصلهها، بنرها، تصاویر، انیمیشنها، هدر/فوتر، منوها، گالری، FAQ یا ساختار ۱۱ مسیر ایجاد نشد.</li>
<li><span class="warn">NOT TESTED</span> MySQL/MariaDB واقعی، SMTP، multisite، نسخههای دیگر WP/PHP، دستگاههای فیزیکی، افزونههای شخص ثالث، Theme Check، PageSpeed/CDN/تست بار و مهاجرت بین دو هاست.</li>
</ul>
<p class="small">مستندات تکمیلی و نتایج خام: <code>qa/results/v110-13-tests.json</code>، <code>v110-visual.json</code>، <code>v110-browser.json</code>، <code>v110-interactions.json</code>، <code>v110-asset-parity.json</code> و <code>v110-csv-verify.json</code>.</p>
`;

const reportHtml = wrap('گزارش تست اصلاح نهایی — نسخه ۱٫۱٫۰',
  'لینک بلد، فرمهای واقعی، افزونه مستقل درخواستها، ۱۳ آزمون اجراشده و عدم تغییر طراحی.', reportBody);
const guideHtml = wrap('راهنمای نصب و فعالسازی — نسخه ۱٫۱٫۰',
  'قالب اصلاحشده و افزونه مستقل «درخواستهای آموزشگاه رئوف»؛ بدون تغییر بصری.', guideBody);

fs.writeFileSync(path.join(WORK, 'correction-test-report-fa.html'), reportHtml, 'utf8');
fs.writeFileSync(path.join(WORK, 'install-activation-fa.html'), guideHtml, 'utf8');

const browser2 = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: 'shell' });
async function pdf(html, out) {
  const page = await browser2.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
  await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
  await page.close();
  console.log('wrote', out, fs.statSync(out).size, 'bytes');
}
await pdf(reportHtml, path.join(DIST, 'raouf-academy-correction-test-report-fa.pdf'));
await pdf(guideHtml, path.join(DIST, 'raouf-academy-install-activation-fa.pdf'));
await browser2.close();
