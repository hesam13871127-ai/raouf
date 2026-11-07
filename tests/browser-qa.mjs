/**
 * Browser QA: real Chromium screenshots (desktop + mobile), interaction tests
 * and console/image/overflow checks.
 *
 * Requires optional QA-only dependencies:
 *   mkdir -p .work/qa && cd .work/qa
 *   npm i @sparticuz/chromium@153 puppeteer-core@25
 *   cd ../.. && npm run qa:screens
 *
 * The QA dependencies live outside Git (see .gitignore); the generated
 * screenshots in screenshots/ are committed deliverables.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(process.cwd());
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const QA_MODULES = process.env.QA_MODULES || path.join(ROOT, '.work/qa/node_modules');
const require = createRequire(path.join(ROOT, '.work/qa', 'noop.js'));

const chromiumIndex = pathToFileURL(path.join(QA_MODULES, '@sparticuz/chromium/build/index.js')).href;
const chromiumModule = await import(chromiumIndex);
const chromium = chromiumModule.default;
const puppeteer = require('puppeteer-core');

/* The bundled AL2023 shared libraries are needed on this Debian sandbox. */
await chromiumModule.inflate(path.join(QA_MODULES, '@sparticuz/chromium/bin/al2023.tar.br'));
chromiumModule.setupLambdaEnvironment('/tmp/al2023/lib');
chromium.setGraphicsMode = false;

const outDir = path.join(ROOT, 'screenshots');
fs.mkdirSync(path.join(outDir, 'desktop'), { recursive: true });
fs.mkdirSync(path.join(outDir, 'mobile'), { recursive: true });

const PAGES = [
  { name: 'home', url: '/' },
  { name: 'courses', url: '/courses/' },
  { name: 'course-skin-facial', url: '/courses/skin-facial/' },
  { name: 'course-medical-emergency', url: '/courses/medical-emergency/' },
  { name: 'course-pharmacy-technician', url: '/courses/pharmacy-technician/' },
  { name: 'course-massage-relaxation', url: '/courses/massage-relaxation/' },
  { name: 'about', url: '/about/' },
  { name: 'gallery', url: '/gallery/' },
  { name: 'contact', url: '/contact/' },
  { name: 'register', url: '/register/' },
];

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE,
  desktopViewport: { width: 1440, height: 900 },
  mobileViewport: { width: 390, height: 844 },
  pages: [],
  interactions: [],
  consoleErrors: [],
};

const executablePath = await chromium.executablePath();
const browser = await puppeteer.launch({
  args: chromium.args,
  executablePath,
  headless: 'shell',
});

function watch(page, label) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') report.consoleErrors.push(`${label}: ${msg.text()}`);
  });
  page.on('pageerror', (err) => report.consoleErrors.push(`${label}: PAGEERROR ${err.message}`));
  page.on('requestfailed', (req) => report.consoleErrors.push(`${label}: REQUEST FAILED ${req.url()} ${req.failure()?.errorText}`));
}

async function prepare(page) {
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await new Promise((r) => setTimeout(r, 850));
}

/* Scroll through the whole document so the IntersectionObserver reveal
   animations have fired before a full-page screenshot is captured. */
async function revealAll(page) {
  await page.evaluate(async () => {
    const html = document.documentElement;
    const previous = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    const height = html.scrollHeight;
    for (let y = 0; y < height + 700; y += 550) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    html.style.scrollBehavior = previous;
  });
  await new Promise((r) => setTimeout(r, 250));
}

async function inspect(page, label, viewport) {
  return page.evaluate((vp) => {
    const imgs = Array.from(document.images);
    return {
      title: document.title,
      h1: document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : null,
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      overflowX: document.documentElement.scrollWidth - Math.max(vp.width, window.innerWidth),
      brokenImages: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
      imageCount: imgs.length,
      emptyLinks: Array.from(document.querySelectorAll('a')).filter((a) => !a.getAttribute('href') || a.getAttribute('href') === '#').length,
      revealHidden: Array.from(document.querySelectorAll('.reveal')).filter((e) => getComputedStyle(e).opacity === '0').length,
    };
  }, viewport);
}

for (const viewport of [
  { key: 'desktop', width: 1440, height: 900, isMobile: false },
  { key: 'mobile', width: 390, height: 844, isMobile: true },
]) {
  for (const p of PAGES) {
    const page = await browser.newPage();
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1, isMobile: viewport.isMobile, hasTouch: viewport.isMobile });
    watch(page, `${viewport.key}:${p.name}`);
    const response = await page.goto(BASE + p.url, { waitUntil: 'networkidle2', timeout: 60000 });
    await revealAll(page);
    await prepare(page);
    const info = await inspect(page, `${viewport.key}:${p.name}`, viewport);
    const file = path.join(outDir, viewport.key, `${p.name}.png`);
    /* Fixed UI (sticky call bar / back-to-top) would otherwise be painted at
       an arbitrary position in a full-page capture; hide it for the still. */
    const hideFixed = await page.addStyleTag({ content: '.mobile-call-bar,.back-to-top{display:none !important}' });
    await page.screenshot({ path: file, fullPage: true });
    await hideFixed.evaluate((el) => el.remove());
    const rec = { ...info, page: p.name, url: p.url, viewport: viewport.key, status: response.status(), screenshot: path.relative(ROOT, file) };
    report.pages.push(rec);
    console.log(`[${viewport.key}] ${p.url.padEnd(36)} ${response.status()} overflow=${info.overflowX} brokenImgs=${info.brokenImages.length} revealHidden=${info.revealHidden}`);
    await page.close();
  }
}

/* ---------------------------------------------------------- interactions */
const check = (name, ok, detail = '') => {
  report.interactions.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  watch(page, 'interaction:desktop');
  await page.goto(BASE + '/', { waitUntil: 'networkidle2' });
  await prepare(page);

  // Desktop dropdown
  await page.click('.nav-link--toggle');
  await new Promise((r) => setTimeout(r, 350));
  check('هدر: باز شدن منوی کشویی دوره\u200Cها', await page.evaluate(() => {
    const b = document.querySelector('.nav-link--toggle');
    const d = document.querySelector('#coursesDropdown');
    return b.getAttribute('aria-expanded') === 'true' && getComputedStyle(d).visibility === 'visible';
  }));
  check('هدر: چهار لینک دوره در منوی کشویی', (await page.$$eval('#coursesDropdown .dropdown-link', (els) => els.length)) === 4);

  // FAQ accordion (exclusive via the name attribute)
  const faqState = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('#faq details'));
    items[1].querySelector('summary').click();
    return { second: items[1].open, first: items[0].open };
  });
  check('آکاردئون سؤالات متداول', faqState.second && !faqState.first, JSON.stringify(faqState));

  // Gallery preview lightbox
  await page.click('.gallery-preview-section [data-lightbox-item]');
  await new Promise((r) => setTimeout(r, 250));
  const lbOpen = await page.evaluate(() => {
    const d = document.querySelector('#lightbox');
    return d.open && document.querySelector('#lightboxImage').src.includes('.webp');
  });
  check('لایت\u200Cباکس: باز شدن تصویر', lbOpen);
  const firstSrc = await page.$eval('#lightboxImage', (i) => i.src);
  await page.keyboard.press('ArrowLeft');
  const secondSrc = await page.$eval('#lightboxImage', (i) => i.src);
  check('لایت\u200Cباکس: جابه\u200Cجایی با کیبورد', firstSrc !== secondSrc);
  await page.keyboard.press('Escape');
  check('لایت\u200Cباکس: بسته شدن با Escape', await page.$eval('#lightbox', (d) => !d.open));

  // Back-to-top appears after scrolling
  await page.evaluate(() => window.scrollTo(0, 1200));
  await new Promise((r) => setTimeout(r, 250));
  check('دکمه بازگشت به بالا', await page.$eval('#backToTop', (b) => b.classList.contains('is-shown')));
  await page.close();
}

{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  watch(page, 'interaction:gallery');
  await page.goto(BASE + '/gallery/', { waitUntil: 'networkidle2' });
  await prepare(page);
  await page.click('[data-filter="training"]');
  const filtered = await page.$$eval('#galleryGrid [data-lightbox-item]', (els) => ({
    visible: els.filter((e) => getComputedStyle(e).display !== 'none').length,
    total: els.length,
  }));
  check('فیلتر گالری: دسته آموزش عملی', filtered.visible > 0 && filtered.visible < filtered.total, JSON.stringify(filtered));
  await page.close();
}

{
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  watch(page, 'interaction:mobile');
  await page.goto(BASE + '/', { waitUntil: 'networkidle2' });
  await prepare(page);
  await page.click('#menuToggle');
  check('منوی موبایل: باز شدن', await page.$eval('#mobileNav', (n) => !n.hidden));
  check('منوی موبایل: وجود لینک چهار دوره', (await page.$$eval('.mobile-sub-links a', (els) => els.length)) === 5);
  check('نوار ثابت تماس موبایل', await page.$eval('.mobile-call-bar', (b) => getComputedStyle(b).display !== 'none' && b.querySelector('a[href^="tel:"]') !== null));
  await page.close();
}

{
  // Real end-to-end form submission (server writes to disk before responding).
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  watch(page, 'interaction:register');
  await page.goto(BASE + '/register/?course=skin-facial', { waitUntil: 'networkidle2' });
  await prepare(page);
  const preselected = await page.$eval('#course', (s) => s.value);
  check('فرم ثبت\u200Cنام: پیش\u200Cانتخاب دوره از URL', preselected === 'skin-facial', preselected);

  // Invalid submission must show a validation error and not succeed.
  await page.click('#registerForm [data-submit]');
  await new Promise((r) => setTimeout(r, 250));
  check('فرم ثبت\u200Cنام: جلوگیری از ارسال نامعتبر', await page.evaluate(() =>
    !document.querySelector('#registerForm').hidden &&
    document.querySelectorAll('#registerForm .has-error').length > 0
  ));

  const randomMobile = '09' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0');
  await page.type('#registerForm #name', 'تست کیفیت');
  await page.type('#registerForm #phone', randomMobile);
  await page.select('#registerForm #course', 'massage-relaxation');
  await page.type('#registerForm #message', 'درخواست آزمایشی جهت بررسی عملکرد فرم ثبت\u200Cنام.');
  await page.click('#registerForm [data-submit]');
  await page.waitForFunction(() => {
    const s = document.querySelector('[data-form-success]');
    return s && !s.hidden;
  }, { timeout: 15000 });
  const ref = await page.$eval('[data-form-success] [data-ref]', (e) => e.textContent.trim());
  check('فرم ثبت\u200Cنام: ثبت واقعی و نمایش پیام موفقیت', /^REG-\d{8}-[A-F0-9]{6}$/.test(ref), ref);
  await page.close();
}

{
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  watch(page, 'interaction:contact');
  await page.goto(BASE + '/contact/', { waitUntil: 'networkidle2' });
  await prepare(page);
  await page.type('#contactForm #name', 'تست کیفیت');
  const randomIntl = '+989' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0');
  await page.type('#contactForm #phone', randomIntl);
  await page.type('#contactForm #subject', 'پرسش آزمایشی');
  await page.type('#contactForm #message', 'این یک پیام آزمایشی برای بررسی عملکرد فرم تماس است.');
  await page.click('#contactForm [data-submit]');
  await page.waitForFunction(() => {
    const s = document.querySelector('#contactForm')?.closest('.form-card')?.querySelector('[data-form-success]');
    return s && !s.hidden;
  }, { timeout: 15000 });
  check('فرم تماس: ثبت واقعی و نمایش پیام موفقیت', true);
  await page.close();
}

await browser.close();

fs.writeFileSync(path.join(ROOT, '.work', 'qa-report.json'), JSON.stringify(report, null, 2));
const failures = report.interactions.filter((i) => !i.ok);
const overflow = report.pages.filter((p) => p.overflowX > 2);
const broken = report.pages.filter((p) => p.brokenImages.length || p.emptyLinks || p.status !== 200);
console.log('\n--- SUMMARY ---');
console.log(`pages rendered: ${report.pages.length}`);
console.log(`interactions: ${report.interactions.length}, failures: ${failures.length}`);
console.log(`horizontal overflow pages: ${overflow.length}`);
console.log(`pages with broken images / empty links / bad status: ${broken.length}`);
console.log(`console errors: ${report.consoleErrors.length}`);
if (report.consoleErrors.length) console.log(report.consoleErrors.slice(0, 20).join('\n'));
if (failures.length || overflow.length || broken.length || report.consoleErrors.length) process.exitCode = 1;
