/**
 * Stage C — per-route shared chrome, navigation, responsive, course
 * individuality, hover/focus and real-form interaction tests.
 *
 * Every one of the 11 routes is loaded at desktop and mobile size on the
 * WordPress install; navigation marker counts are compared with the exact
 * authoritative static HTML files. Gallery/FAQ/lightbox parity has its own
 * script: stage-C-gallery-faq.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ROOT = '/home/user/raouf';
const ORIG = process.env.ORIG_URL || 'http://127.0.0.1:3000';
const WP = process.env.WP_URL || 'http://127.0.0.1:9400';
const SRC = path.join(ROOT, '.work', 'wp-source', 'raouf-academy', 'public');
const OUT = path.join(ROOT, 'wordpress-conversion', 'qa', 'results', 'stage-C-interactions.json');
const QA_MODULES = path.join(ROOT, '.work', 'wp-qa', 'node_modules');
const require = createRequire(path.join(QA_MODULES, 'noop.js'));

const chromiumModule = await import(pathToFileURL(path.join(QA_MODULES, '@sparticuz/chromium/build/index.js')).href);
const chromium = chromiumModule.default;
const puppeteer = require('puppeteer-core');
await chromiumModule.inflate(path.join(QA_MODULES, '@sparticuz/chromium/bin/al2023.tar.br'));
chromiumModule.setupLambdaEnvironment('/tmp/al2023/lib');
chromium.setGraphicsMode = false;

const ROUTES = [
  { route: '/', file: 'index.html' },
  { route: '/courses/', file: 'courses/index.html' },
  { route: '/courses/skin-facial/', file: 'courses/skin-facial/index.html' },
  { route: '/courses/medical-emergency/', file: 'courses/medical-emergency/index.html' },
  { route: '/courses/pharmacy-technician/', file: 'courses/pharmacy-technician/index.html' },
  { route: '/courses/massage-relaxation/', file: 'courses/massage-relaxation/index.html' },
  { route: '/about/', file: 'about/index.html' },
  { route: '/gallery/', file: 'gallery/index.html' },
  { route: '/contact/', file: 'contact/index.html' },
  { route: '/register/', file: 'register/index.html' },
  { route: '/404/', file: '404/index.html' },
];
const COURSES = ['/courses/skin-facial/', '/courses/medical-emergency/', '/courses/pharmacy-technician/', '/courses/massage-relaxation/'];

const report = { stage: 'C', orig: ORIG, wp: WP, routes: [], checks: [], consoleErrors: [], failedRequests: [], courses: [] };
const check = (name, ok, detail = '') => {
  report.checks.push({ name, ok: Boolean(ok), detail: String(detail) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  return Boolean(ok);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: 'shell' });

function watch(page, label) {
  page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push(`${label}: ${m.text()}`); });
  page.on('pageerror', (e) => report.consoleErrors.push(`${label}: PAGEERROR ${e.message}`));
  page.on('requestfailed', (r) => report.failedRequests.push(`${label}: ${r.url()} ${r.failure()?.errorText}`));
}

async function open(base, url, vp, label) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: vp.mobile, hasTouch: !!vp.mobile });
  watch(page, label);
  const res = await page.goto(base + url, { waitUntil: 'networkidle2', timeout: 120000 });
  await page.evaluate(() => document.fonts?.ready);
  await wait(300);
  return { page, status: res.status() };
}

// Expected active-navigation markers from the authoritative static HTML.
function sourceActive(file) {
  const s = fs.readFileSync(path.join(SRC, file), 'utf8');
  const desktop = (s.match(/class="nav-link[^"]*is-active/g) || []).length;
  const mobile = (s.match(/class="mobile-link[^"]*is-active/g) || []).length;
  return { desktop, mobile };
}

const DESKTOP = { width: 1366, height: 768, mobile: false };
const MOBILE = { width: 390, height: 844, mobile: true };

/* ------------------------------------------------ 1. all routes, 2 sizes */
for (const r of ROUTES) {
  for (const vp of [DESKTOP, MOBILE]) {
    const label = `wp:${vp.width}x${vp.height}:${r.route}`;
    const { page, status } = await open(WP, r.route, vp, label);
    const info = await page.evaluate(() => ({
      dir: document.documentElement.dir,
      lang: document.documentElement.lang,
      computedDirection: getComputedStyle(document.body).direction,
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      maxScroll: document.documentElement.scrollHeight - window.innerHeight,
      brokenImages: Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0).length,
      emptyLinks: Array.from(document.querySelectorAll('a')).filter((a) => !a.getAttribute('href') || a.getAttribute('href') === '#').length,
      chrome: {
        header: !!document.querySelector('.site-header'),
        topbar: !!document.querySelector('.header-topbar'),
        footer: !!document.querySelector('.site-footer'),
        mobileNav: !!document.querySelector('#mobileNav'),
        callBar: !!document.querySelector('.mobile-call-bar'),
        backToTop: !!document.querySelector('.back-to-top'),
      },
      callBarDisplay: document.querySelector('.mobile-call-bar') ? getComputedStyle(document.querySelector('.mobile-call-bar')).display : 'missing',
      callBarTel: !!document.querySelector('.mobile-call-bar a[href^="tel:"]'),
      desktopNavLinks: document.querySelectorAll('.desktop-nav .nav-link').length,
      mobileNavLinks: document.querySelectorAll('#mobileNav .mobile-link').length,
      activeDesktop: document.querySelectorAll('.desktop-nav .is-active').length,
      activeMobile: document.querySelectorAll('#mobileNav .is-active').length,
      backToTopShown: document.querySelector('#backToTop')?.classList.contains('is-shown'),
    }));
    const expected = sourceActive(r.file);
    let dropdown = null;
    if (!vp.mobile) {
      await page.click('.nav-link--toggle');
      await wait(320);
      dropdown = await page.evaluate(() => ({
        expanded: document.querySelector('.nav-link--toggle').getAttribute('aria-expanded'),
        visibility: getComputedStyle(document.querySelector('#coursesDropdown')).visibility,
        courseLinks: document.querySelectorAll('#coursesDropdown .dropdown-link').length,
      }));
      await page.keyboard.press('Escape');
      await wait(150);
    }
    let mobileMenu = null;
    if (vp.mobile) {
      await page.click('#menuToggle');
      await wait(220);
      mobileMenu = await page.evaluate(() => ({
        hidden: document.querySelector('#mobileNav').hidden,
        expanded: document.querySelector('#menuToggle').getAttribute('aria-expanded'),
        subLinks: document.querySelectorAll('.mobile-sub-links a').length,
      }));
      await page.keyboard.press('Escape');
      await wait(150);
    }
    // back-to-top appears after scrolling
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await wait(250);
    const backToTop = await page.$eval('#backToTop', (e) => e.classList.contains('is-shown')).catch(() => false);
    const expectedBackToTop = info.maxScroll > 480;
    const rec = {
      route: r.route, viewport: `${vp.width}x${vp.height}`, status, ...info,
      expectedActive: expected, dropdown, mobileMenu, expectedBackToTop, backToTopAfterScroll: backToTop,
    };
    report.routes.push(rec);
    const ok = info.dir === 'rtl' && info.lang === 'fa' && info.computedDirection === 'rtl'
      && info.overflowX <= 2 && info.brokenImages === 0 && info.emptyLinks === 0
      && Object.values(info.chrome).every(Boolean) && info.callBarTel
      && info.activeDesktop === expected.desktop && info.activeMobile === expected.mobile
      && (!dropdown || (dropdown.expanded === 'true' && dropdown.visibility === 'visible' && dropdown.courseLinks === 4))
      && (!mobileMenu || (mobileMenu.hidden === false && mobileMenu.expanded === 'true' && mobileMenu.subLinks === 5))
      && backToTop === expectedBackToTop
      && (vp.mobile ? info.callBarDisplay !== 'none' : info.callBarDisplay === 'none');
    check(`${r.route} @${rec.viewport} chrome/RTL/nav/responsive`, ok,
      JSON.stringify({ status, chrome: info.chrome, active: [info.activeDesktop, info.activeMobile], expected, callBar: info.callBarDisplay, dropdown, mobileMenu, backToTop, expectedBackToTop }));
    await page.close();
  }
}

/* ------------------------------------------- 2. course page individuality */
for (const route of COURSES) {
  const { page } = await open(WP, route, DESKTOP, `course:${route}`);
  const c = await page.evaluate(() => {
    const hero = document.querySelector('[class*="course-hero--"]');
    const main = document.querySelector('#main');
    return {
      h1: (document.querySelector('h1')?.textContent || '').trim(),
      accentClass: hero ? Array.from(hero.classList).find((x) => x.startsWith('course-hero--')) : null,
      heroBackground: hero ? getComputedStyle(hero).backgroundColor : null,
      heroGradient: hero ? getComputedStyle(hero).backgroundImage : null,
      shapeA: (() => { const e = main.querySelector('.inner-hero-shape--a'); return e ? getComputedStyle(e).backgroundImage : null; })(),
      shapeB: (() => { const e = main.querySelector('.inner-hero-shape--b'); return e ? getComputedStyle(e).backgroundImage : null; })(),
      sections: main.querySelectorAll('section').length,
      faqDetails: main.querySelectorAll('details.faq-item').length,
      faqNames: Array.from(main.querySelectorAll('details.faq-item')).map((d) => d.getAttribute('name')),
      images: Array.from(main.querySelectorAll('img')).map((i) => (i.getAttribute('src') || '').split('/').pop()),
      inlineSvgs: main.querySelectorAll('svg').length,
      jsonldType: (() => { try { return JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)['@type']; } catch (e) { return null; } })(),
    };
  });
  // Original course-specific accent colours, for parity.
  const { page: op } = await open(ORIG, route, DESKTOP, `course-orig:${route}`);
  const oc = await op.evaluate(() => {
    const main = document.querySelector('#main');
    const f = (sel) => { const e = main.querySelector(sel); return e ? getComputedStyle(e).backgroundImage : null; };
    return { shapeA: f('.inner-hero-shape--a'), shapeB: f('.inner-hero-shape--b') };
  });
  await op.close();
  c.originalAccentGradients = oc;
  c.accentGradientsMatchOriginal = c.shapeA === oc.shapeA && c.shapeB === oc.shapeB;
  report.courses.push({ route, ...c });
  console.log(`COURSE ${route.padEnd(38)} h1=${c.h1.slice(0, 32)} accent=${c.accentClass} bg=${c.heroBackground} images=${c.images.length} faq=${c.faqDetails}`);
  await page.close();
}
check('4 course pages have 4 distinct h1 / accent classes / image sets',
  new Set(report.courses.map((c) => c.h1)).size === 4 &&
  new Set(report.courses.map((c) => c.accentClass)).size === 4 &&
  new Set(report.courses.map((c) => c.images.join(','))).size === 4 &&
  report.courses.every((c) => c.jsonldType === 'Course' && c.accentGradientsMatchOriginal && c.shapeA && c.shapeB),
  JSON.stringify(report.courses.map((c) => [c.accentClass, c.heroBackground, c.images.length, c.faqDetails])));

/* ----------------------------------------------- 3. hover / focus states */
{
  const results = {};
  for (const [label, base] of [['orig', ORIG], ['wp', WP]]) {
    const { page } = await open(base, '/', DESKTOP, `hover:${label}`);
    const before = await page.$eval('.header-cta', (e) => ({ bg: getComputedStyle(e).backgroundColor, transform: getComputedStyle(e).transform }));
    await page.hover('.header-cta');
    await wait(220);
    const after = await page.$eval('.header-cta', (e) => ({ bg: getComputedStyle(e).backgroundColor, transform: getComputedStyle(e).transform }));
    await page.focus('.header-cta');
    const focus = await page.$eval('.header-cta', (e) => ({ outlineWidth: getComputedStyle(e).outlineWidth, outlineStyle: getComputedStyle(e).outlineStyle }));
    const cssHasHover = await page.evaluate(() => Array.from(document.styleSheets).some((s) => {
      try { return Array.from(s.cssRules).some((r) => r.selectorText && r.selectorText.includes(':hover')); } catch (e) { return false; }
    }));
    const round = (v) => v.replace(/-?\d+\.\d+/g, (n) => Number(n).toFixed(2));
    results[label] = { before, after, focus, cssHasHover,
      normTransform: { before: round(before.transform), after: round(after.transform) } };
    await page.close();
  }
  check('hover and focus CSS active on both sites (identical states)',
    JSON.stringify({ ...results.orig, after: { ...results.orig.after, transform: results.orig.normTransform.after }, before: { ...results.orig.before, transform: results.orig.normTransform.before } }) ===
      JSON.stringify({ ...results.wp, after: { ...results.wp.after, transform: results.wp.normTransform.after }, before: { ...results.wp.before, transform: results.wp.normTransform.before } }) && results.wp.cssHasHover &&
    (results.wp.before.bg !== results.wp.after.bg || results.wp.before.transform !== results.wp.after.transform),
    JSON.stringify(results));
}

/* --------------------------------------------------- 4. real form wiring */
{
  const uniq = String(Date.now()).slice(-7);
  const { page } = await open(WP, '/register/?course=skin-facial', DESKTOP, 'form:register');
  check('course preselected from query string', (await page.$eval('#course', (s) => s.value)) === 'skin-facial');
  await page.click('#registerForm [data-submit]');
  await wait(250);
  check('client-side validation blocks empty registration',
    await page.evaluate(() => document.querySelectorAll('#registerForm .has-error').length > 0));
  await page.type('#registerForm #name', 'بررسی مرحله C');
  await page.type('#registerForm #phone', '0914' + uniq);
  await page.select('#registerForm #course', 'massage-relaxation');
  await page.type('#registerForm #message', 'پیام آزمایشی بررسی یکپارچگی فرمها در مرحله C.');
  await page.click('#registerForm [data-submit]');
  let ref = '';
  try {
    await page.waitForFunction(() => { const s = document.querySelector('#registerForm')?.closest('.form-card')?.querySelector('[data-form-success]'); return s && !s.hidden; }, { timeout: 25000 });
    ref = await page.evaluate(() => document.querySelector('#registerForm').closest('.form-card').querySelector('[data-form-success] [data-ref]')?.textContent.trim() || '');
    check('registration really persists (success + reference)', /^REG-\d{8}-[A-F0-9]{6}$/.test(ref), ref);
  } catch (e) {
    check('registration really persists (success + reference)', false, await page.$eval('[data-form-alert]', (x) => x.textContent).catch(() => String(e)));
  }
  await page.close();

  const { page: cp } = await open(WP, '/contact/', DESKTOP, 'form:contact');
  await cp.type('#contactForm #name', 'بررسی مرحله C');
  await cp.type('#contactForm #phone', '+98914' + uniq);
  await cp.type('#contactForm #subject', 'پرسش مرحله C');
  await cp.type('#contactForm #message', 'پیام آزمایشی بررسی یکپارچگی فرم تماس در مرحله C.');
  await cp.click('#contactForm [data-submit]');
  let cref = '';
  try {
    await cp.waitForFunction(() => { const s = document.querySelector('#contactForm')?.closest('.form-card')?.querySelector('[data-form-success]'); return s && !s.hidden; }, { timeout: 25000 });
    cref = await cp.evaluate(() => document.querySelector('#contactForm').closest('.form-card').querySelector('[data-form-success] [data-ref]')?.textContent.trim() || '');
    check('contact really persists (success + reference)', /^MSG-\d{8}-[A-F0-9]{6}$/.test(cref), cref);
  } catch (e) {
    check('contact really persists (success + reference)', false, await cp.$eval('[data-form-alert]', (x) => x.textContent).catch(() => String(e)));
  }
  await cp.close();
  report.formReferences = [ref, cref];
}

await browser.close();
fs.mkdirSync(path.dirname(OUT), { recursive: true });
report.summary = {
  route_viewport_checks: report.routes.length,
  routes_covered: new Set(report.routes.map((r) => r.route)).size,
  checks: report.checks.length,
  failures: report.checks.filter((c) => !c.ok).length,
  consoleErrors: report.consoleErrors.length,
  failedRequests: report.failedRequests.length,
};
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(`\nchecks=${report.checks.length} failures=${report.checks.filter((c) => !c.ok).length} consoleErrors=${report.consoleErrors.length}`);
if (report.consoleErrors.length) console.log(report.consoleErrors.slice(0, 20).join('\n'));
if (report.checks.some((c) => !c.ok)) process.exitCode = 1;
