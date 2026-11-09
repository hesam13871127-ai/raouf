/** Real Chromium interaction tests against the WordPress installation. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ROOT = '/home/user/raouf';
const BASE = process.env.WP_URL || 'http://127.0.0.1:9400';
const QA_MODULES = path.join(ROOT, '.work', 'wp-qa', 'node_modules');
const require = createRequire(path.join(QA_MODULES, 'noop.js'));
const chromiumModule = await import(pathToFileURL(path.join(QA_MODULES, '@sparticuz/chromium/build/index.js')).href);
const chromium = chromiumModule.default;
const puppeteer = require('puppeteer-core');
await chromiumModule.inflate(path.join(QA_MODULES, '@sparticuz/chromium/bin/al2023.tar.br'));
chromiumModule.setupLambdaEnvironment('/tmp/al2023/lib');
chromium.setGraphicsMode = false;

const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: 'shell' });
const report = { base: BASE, generatedAt: new Date().toISOString(), checks: [], consoleErrors: [] };
const check = (name, ok, detail = '') => {
  report.checks.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};
function watch(page, label) {
  page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push(`${label}: ${m.text()}`); });
  page.on('pageerror', (e) => report.consoleErrors.push(`${label}: PAGEERROR ${e.message}`));
  page.on('requestfailed', (r) => report.consoleErrors.push(`${label}: REQUEST FAILED ${r.url()} ${r.failure()?.errorText}`));
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function prepare(page) {
  await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
  await wait(500);
}

async function open(url, vp, label) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: !!vp.mobile, hasTouch: !!vp.mobile });
  watch(page, label);
  const res = await page.goto(BASE + url, { waitUntil: 'networkidle2', timeout: 90000 });
  await prepare(page);
  return { page, status: res.status() };
}

/* 1. Desktop header dropdown, FAQ, lightbox, back-to-top, reveal, links, RTL */
{
  const { page, status } = await open('/', { width: 1440, height: 900 }, 'desktop');
  check('homepage HTTP 200', status === 200, String(status));
  check('RTL + Persian lang', await page.evaluate(() => document.documentElement.dir === 'rtl' && document.documentElement.lang === 'fa'));
  await page.click('.nav-link--toggle'); await wait(380);
  check('desktop courses dropdown opens', await page.evaluate(() => document.querySelector('.nav-link--toggle').getAttribute('aria-expanded') === 'true' && getComputedStyle(document.querySelector('#coursesDropdown')).visibility === 'visible'));
  check('dropdown has 4 course links', (await page.$$eval('#coursesDropdown .dropdown-link', (e) => e.length)) === 4);
  const faq = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('#faq details'));
    items[1].querySelector('summary').click();
    return { second: items[1].open, first: items[0].open };
  });
  check('FAQ exclusive accordion', faq.second && !faq.first, JSON.stringify(faq));
  await page.click('.gallery-preview-section [data-lightbox-item]'); await wait(280);
  check('lightbox opens with an image', await page.evaluate(() => document.querySelector('#lightbox').open && document.querySelector('#lightboxImage').src.includes('.webp')));
  const a = await page.$eval('#lightboxImage', (i) => i.src);
  await page.keyboard.press('ArrowLeft');
  const b = await page.$eval('#lightboxImage', (i) => i.src);
  check('lightbox keyboard navigation', a !== b);
  await page.keyboard.press('Escape');
  check('lightbox closes with Escape', await page.$eval('#lightbox', (d) => !d.open));
  await page.evaluate(() => window.scrollTo(0, 1200)); await wait(300);
  check('back-to-top appears', await page.$eval('#backToTop', (e) => e.classList.contains('is-shown')));
  check('no empty links', (await page.$$eval('a', (els) => els.filter((a) => !a.getAttribute('href') || a.getAttribute('href') === '#').length)) === 0);
  check('tel + instagram links present', await page.evaluate(() => !!document.querySelector('a[href="tel:+989141803287"]') && !!document.querySelector('a[href="https://www.instagram.com/academi_raouf/"]')));
  check('no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2));
  await page.close();
}

/* 2. Gallery filter */
{
  const { page } = await open('/gallery/', { width: 1440, height: 900 }, 'gallery');
  await page.click('[data-filter="training"]');
  const f = await page.$$eval('#galleryGrid [data-lightbox-item]', (els) => ({ visible: els.filter((e) => getComputedStyle(e).display !== 'none').length, total: els.length }));
  check('gallery filter works', f.visible > 0 && f.visible < f.total, JSON.stringify(f));
  await page.close();
}

/* 3. Mobile navigation */
{
  const { page } = await open('/', { width: 390, height: 844, mobile: true }, 'mobile');
  await page.click('#menuToggle'); await wait(200);
  check('mobile menu opens', await page.$eval('#mobileNav', (n) => !n.hidden));
  check('mobile menu has 5 course/overview links', (await page.$$eval('.mobile-sub-links a', (e) => e.length)) === 5);
  check('mobile call bar visible with tel link', await page.$eval('.mobile-call-bar', (b) => getComputedStyle(b).display !== 'none' && !!b.querySelector('a[href^="tel:"]')));
  await page.close();
}

/* 4. Real registration form (client validation + real WP persistence) */
{
  const { page } = await open('/register/?course=skin-facial', { width: 1280, height: 900 }, 'register');
  check('course preselected from URL', (await page.$eval('#course', (s) => s.value)) === 'skin-facial');
  await page.click('#registerForm [data-submit]'); await wait(280);
  check('invalid registration blocked client-side', await page.evaluate(() => !document.querySelector('#registerForm').hidden && document.querySelectorAll('#registerForm .has-error').length > 0));
  const phone = '09' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0');
  await page.type('#registerForm #name', 'تست کیفیت');
  await page.type('#registerForm #phone', phone);
  await page.select('#registerForm #course', 'massage-relaxation');
  await page.type('#registerForm #message', 'درخواست آزمایشی جهت بررسی عملکرد فرم ثبت نام.');
  await page.click('#registerForm [data-submit]');
  try {
    await page.waitForFunction(() => { const s = document.querySelector('[data-form-success]'); return s && !s.hidden; }, { timeout: 20000 });
    const ref = await page.$eval('[data-form-success] [data-ref]', (e) => e.textContent.trim());
    check('registration really saved + success panel', /^REG-\d{8}-[A-F0-9]{6}$/.test(ref), ref);
  } catch (e) {
    const alert = await page.$eval('[data-form-alert]', (e) => e.textContent).catch(() => '');
    check('registration really saved + success panel', false, alert);
  }
  await page.close();
}

/* 5. Real contact form */
{
  const { page } = await open('/contact/', { width: 1280, height: 900 }, 'contact');
  await page.type('#contactForm #name', 'تست کیفیت');
  await page.type('#contactForm #phone', '+989' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0'));
  await page.type('#contactForm #subject', 'پرسش آزمایشی');
  await page.type('#contactForm #message', 'این یک پیام آزمایشی برای بررسی عملکرد فرم تماس است.');
  await page.click('#contactForm [data-submit]');
  try {
    await page.waitForFunction(() => { const s = document.querySelector('#contactForm')?.closest('.form-card')?.querySelector('[data-form-success]'); return s && !s.hidden; }, { timeout: 20000 });
    const ref = await page.$eval('#contactForm ~ [data-form-success] [data-ref]', (e) => e.textContent.trim()).catch(() => '');
    check('contact really saved + success panel', true, ref);
  } catch (e) {
    const alert = await page.$eval('[data-form-alert]', (e) => e.textContent).catch(() => '');
    check('contact really saved + success panel', false, alert);
  }
  await page.close();
}

/* 6. Every original page loads in WP with no broken images */
for (const url of ['/courses/', '/courses/skin-facial/', '/courses/medical-emergency/', '/courses/pharmacy-technician/', '/courses/massage-relaxation/', '/about/', '/contact/', '/register/']) {
  const { page, status } = await open(url, { width: 1366, height: 768 }, `page:${url}`);
  const info = await page.evaluate(() => ({ broken: Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0).length, empty: Array.from(document.querySelectorAll('a')).filter((a) => !a.getAttribute('href') || a.getAttribute('href') === '#').length }));
  check(`${url} loads, no broken images/empty links`, status === 200 && info.broken === 0 && info.empty === 0, JSON.stringify(info));
  await page.close();
}

await browser.close();
fs.mkdirSync(path.join(ROOT, '.work', 'wp-qa', 'forms'), { recursive: true });
fs.writeFileSync(path.join(ROOT, '.work', 'wp-qa', 'forms', 'interactions.json'), JSON.stringify(report, null, 2));
const failed = report.checks.filter((c) => !c.ok);
console.log(`\nchecks=${report.checks.length} failures=${failed.length} consoleErrors=${report.consoleErrors.length}`);
if (report.consoleErrors.length) console.log(report.consoleErrors.slice(0, 20).join('\n'));
if (failed.length || report.consoleErrors.length) process.exitCode = 1;
