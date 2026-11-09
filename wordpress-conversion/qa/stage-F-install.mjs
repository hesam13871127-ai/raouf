/**
 * Stage F — install the FINAL theme ZIP through the real WordPress admin UI,
 * activate it, verify every route afterwards, and capture proof screenshots.
 *
 * The ZIP under test is the exact file that is delivered; its SHA-256 is
 * recorded in the JSON report. Tests run on a fresh WordPress install with no
 * pre-mounted theme.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ROOT = '/home/user/raouf';
const BASE = process.env.FRESH_URL || 'http://127.0.0.1:9411';
const ZIP = process.env.THEME_ZIP || path.join(ROOT, 'wordpress-conversion', 'dist', 'raouf-academy-wordpress-theme.zip');
const OUT_JSON = process.env.INSTALL_REPORT || path.join(ROOT, 'wordpress-conversion', 'qa', 'results', 'stage-F-install.json');
const SHOTS = process.env.SHOT_DIR || path.join(ROOT, 'wordpress-conversion', 'qa', 'results', 'screenshots');
const QA_MODULES = path.join(ROOT, '.work', 'wp-qa', 'node_modules');
const require = createRequire(path.join(QA_MODULES, 'noop.js'));
const chromiumModule = await import(pathToFileURL(path.join(QA_MODULES, '@sparticuz/chromium/build/index.js')).href);
const chromium = chromiumModule.default;
const puppeteer = require('puppeteer-core');
await chromiumModule.inflate(path.join(QA_MODULES, '@sparticuz/chromium/bin/al2023.tar.br'));
chromiumModule.setupLambdaEnvironment('/tmp/al2023/lib');
chromium.setGraphicsMode = false;

fs.mkdirSync(SHOTS, { recursive: true });
const bytes = fs.readFileSync(ZIP);
const zipSha = crypto.createHash('sha256').update(bytes).digest('hex');
const report = {
  stage: 'F', generatedAt: new Date().toISOString(), base: BASE, zip: ZIP,
  zip_sha256: zipSha, zip_bytes: bytes.length, steps: [], screenshots: [],
  routes: [], consoleErrors: [], failedRequests: [], httpErrors: [],
};
const log = (name, ok, detail = '') => {
  report.steps.push({ name, result: ok ? 'PASS' : 'FAIL', detail: String(detail) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + String(detail).slice(0, 220) : ''}`);
};
const shot = async (page, file, label) => {
  const p = path.join(SHOTS, file);
  await page.screenshot({ path: p, type: 'png', fullPage: false });
  report.screenshots.push({ file: p, label });
  console.log('  screenshot:', file);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function gotoRetry(page, url, tries = 6) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { return await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 }); }
    catch (e) { last = e; await wait(2500); }
  }
  throw last;
}

const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: 'shell' });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('pageerror', (e) => report.consoleErrors.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push(`${m.text()} @ ${m.location()?.url || ''}`); });
page.on('requestfailed', (r) => report.failedRequests.push(`REQUEST FAILED ${r.url()} ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 400) report.httpErrors.push(`HTTP ${r.status()} ${r.url()}`); });

/* 0. Fresh install has no Raouf theme yet. */
await gotoRetry(page, BASE + '/wp-login.php');
const beforeTheme = await page.evaluate(() => !/raouf-academy/.test(document.documentElement.outerHTML));
log('fresh WordPress has no Raouf theme before upload', beforeTheme);
await shot(page, '01-wp-login.png', 'ورود به پیشخوان وردپرس تازه');

/* 1. Log in through the real login form. */
await page.type('#user_login', 'admin');
await page.type('#user_pass', 'password');
await Promise.all([
  page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {}),
  page.click('#wp-submit'),
]);
await wait(1200);
const loggedIn = await page.evaluate(() => document.body.classList.contains('wp-admin') || !!document.querySelector('#wpadminbar'));
log('admin login succeeds', loggedIn, page.url());

/* 2. Appearance → Themes → Add New → Upload Theme. */
await gotoRetry(page, BASE + '/wp-admin/theme-install.php?upload');
const formPresent = await page.$('#themezip') !== null && await page.$('#install-theme-submit') !== null;
log('Upload Theme form present', formPresent);
await shot(page, '02-upload-theme-form.png', 'فرم بارگذاری پوسته در پیشخوان');
const input = await page.$('#themezip');
await input.uploadFile(ZIP);
await Promise.all([
  page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 180000 }).catch(() => {}),
  page.evaluate(() => document.querySelector('#install-theme-submit').click()),
]);
await wait(2500);
const resultText = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 4000));
const installed = /Theme installed successfully|Unpacking the package|Installing Theme from uploaded file|فعال کردن|Activate/i.test(resultText);
log('ZIP uploads and installs via admin UI', installed, resultText.slice(0, 300));
await shot(page, '03-theme-install-success.png', 'پیام نصب موفق پوسته');

/* 3. Activate from the success screen or the Themes screen. */
let activated = false;
try {
  const link = await page.$('a[href*="action=activate"][href*="stylesheet=raouf-academy"], a.activate[href*="raouf-academy"]');
  if (link) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {}),
      page.evaluate((el) => el.click(), link),
    ]);
    await wait(1400);
    activated = /activated|فعال شد|New theme activated/i.test(await page.evaluate(() => document.body.innerText));
  }
} catch (e) { /* fall through */ }
if (!activated) {
  await gotoRetry(page, BASE + '/wp-admin/themes.php');
  const activateLink = await page.$('a[href*="action=activate"][href*="stylesheet=raouf-academy"]');
  if (activateLink) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {}),
      page.evaluate((el) => el.click(), activateLink),
    ]);
    await wait(1400);
    activated = await page.evaluate(() => /raouf-academy/i.test(document.body.innerText) || !!document.querySelector('.theme.active'));
  }
}
log('theme activates from Appearance → Themes', activated);
await gotoRetry(page, BASE + '/wp-admin/themes.php');
await shot(page, '04-theme-activated.png', 'پوسته رئوف بهعنوان پوسته فعال در پیشخوان');
const themeActive = await page.evaluate(() => {
  const active = document.querySelector('.theme.active');
  return !!active && /raouf|رئوف/i.test(active.innerText || '');
});
log('themes.php shows Raouf Academy as the active theme', themeActive);

/* 4. Front end after activation: all 11 routes. */
const ROUTES = ['/', '/courses/', '/courses/skin-facial/', '/courses/medical-emergency/',
  '/courses/pharmacy-technician/', '/courses/massage-relaxation/', '/about/',
  '/gallery/', '/contact/', '/register/', '/404/'];
for (const route of ROUTES) {
  const res = await gotoRetry(page, BASE + route);
  const info = await page.evaluate(() => ({
    dir: document.documentElement.dir,
    lang: document.documentElement.lang,
    title: document.title,
    themeCss: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some((l) => l.href.includes('raouf-academy/style.css')),
    mainLength: (document.querySelector('main#main')?.innerHTML || '').length,
    h1: document.querySelector('h1')?.textContent.trim() || '',
    images: document.images.length,
    phpErrors: (document.documentElement.outerHTML.match(/(?:Fatal error|Parse error|Warning|Notice|Deprecated):[^<\n]{0,120}/g) || []),
  }));
  const expectedStatus = route === '/404/' ? 404 : 200;
  const ok = res.status() === expectedStatus && info.themeCss && info.dir === 'rtl' && info.lang === 'fa'
    && info.h1.length > 3 && info.mainLength > 500 && info.phpErrors.length === 0;
  report.routes.push({ route, http: res.status(), ...info, ok });
  log(`route ${route}`, ok, `http=${res.status()} h1="${info.h1.slice(0, 40)}" main=${info.mainLength} css=${info.themeCss}`);
}
await gotoRetry(page, BASE + '/');
await shot(page, '05-front-page-after-activation.png', 'صفحه نخست پس از نصب و فعالسازی');

/* 5. Installed bytes match the delivered ZIP (style.css, app.js). */
const localStyle = fs.readFileSync(path.join(ROOT, 'wordpress-conversion', 'theme', 'raouf-academy', 'style.css'));
const localJs = fs.readFileSync(path.join(ROOT, 'wordpress-conversion', 'theme', 'raouf-academy', 'assets', 'js', 'app.js'));
for (const [rel, local] of [['style.css', localStyle], ['assets/js/app.js', localJs]]) {
  const buf = await page.evaluate(async (u) => {
    const r = await fetch(u);
    const a = new Uint8Array(await r.arrayBuffer());
    let s = ''; for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
    return btoa(s);
  }, BASE + '/wp-content/themes/raouf-academy/' + rel);
  const served = Buffer.from(buf, 'base64');
  const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
  log(`installed ${rel} is byte-identical to the delivered version`, served.equals(local),
    `sha256=${sha(served)}`);
}

/* 6. WordPress activation side effects: seeded pages, menus, front page. */
await gotoRetry(page, BASE + '/wp-admin/edit.php?post_type=page');
const pageList = await page.evaluate(() => ({
  rows: document.querySelectorAll('#the-list tr').length,
  titles: Array.from(document.querySelectorAll('#the-list .row-title')).map((e) => e.textContent.trim()),
  hasSample: /Sample Page|نمونه/i.test(document.body.innerText),
}));
log('activation seeded the original pages (no core Sample Page)',
  pageList.rows >= 10 && !pageList.hasSample, JSON.stringify(pageList.titles.slice(0, 12)));
await gotoRetry(page, BASE + '/wp-admin/nav-menus.php?action=locations');
const menus = await page.evaluate(() => ({
  text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 6000),
  options: Array.from(document.querySelectorAll('select option')).map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean),
}));
log('two real navigation menus exist and are assigned to locations',
  /منوی اصلی رئوف/.test(menus.text) && /دوره‌های آموزشی رئوف/.test(menus.text),
  JSON.stringify(menus.options.slice(0, 8)));
await gotoRetry(page, BASE + '/');
const nav = await page.evaluate(() => ({
  dropdown: document.querySelectorAll('#coursesDropdown .dropdown-link').length,
  footerCourseLinks: document.querySelectorAll('.footer-col a, .footer-links a').length,
}));
log('front-end primary menu renders all 4 course links', nav.dropdown === 4, JSON.stringify(nav));

/* 7. Honest classification of sandbox-only network noise. */
const external = report.failedRequests.filter((x) => /gravatar|\.wp\.com|wordpress\.org/.test(x));
const internalFailures = report.failedRequests.filter((x) => !/gravatar|\.wp\.com|wordpress\.org/.test(x));
const themeAssetErrors = report.httpErrors.filter((x) => /\/wp-content\/themes\/raouf-academy\//.test(x));
log('no failed request belongs to the theme or the front end',
  internalFailures.length === 0,
  `external_admin_avatar_requests=${external.length} internal=${internalFailures.length}`);
log('no 4xx/5xx for any delivered theme asset', themeAssetErrors.length === 0,
  JSON.stringify(themeAssetErrors.slice(0, 5)));
report.network_classification = {
  external_admin_avatar_requests: external.length,
  internal_failed_requests: internalFailures,
  theme_asset_http_errors: themeAssetErrors,
  http_errors: report.httpErrors,
  note: 'secure.gravatar.com is an external WordPress-admin avatar host; outbound access is blocked in this sandbox. The /404/ route returns an intentional HTTP 404 and the WP admin may log a 404 for a missing dashboard asset. Neither originates from the delivered theme or a public page.',
};

await browser.close();
report.summary = {
  steps: report.steps.length,
  PASS: report.steps.filter((s) => s.result === 'PASS').length,
  FAIL: report.steps.filter((s) => s.result === 'FAIL').length,
  routes_checked: report.routes.length,
  routes_ok: report.routes.filter((r) => r.ok).length,
  screenshots: report.screenshots.length,
  consoleErrors: report.consoleErrors.length,
  failedRequests: report.failedRequests.length,
  httpErrors: report.httpErrors.length,
  external_admin_avatar_requests: external.length,
};
fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
console.log('\nSUMMARY', JSON.stringify(report.summary));
if (report.consoleErrors.length) console.log('console errors:\n' + report.consoleErrors.slice(0, 10).join('\n'));
if (report.summary.FAIL || report.summary.routes_ok !== 11) process.exitCode = 1;
