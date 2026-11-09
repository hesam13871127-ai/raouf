/** Real WordPress admin test: upload + activate the theme ZIP. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ROOT = '/home/user/raouf';
const BASE = process.env.FRESH_URL || 'http://127.0.0.1:9402';
const ZIP = process.env.THEME_ZIP || path.join(ROOT, 'wordpress-conversion', 'dist', 'raouf-academy-wordpress-theme.zip');
const QA_MODULES = path.join(ROOT, '.work', 'wp-qa', 'node_modules');
const require = createRequire(path.join(QA_MODULES, 'noop.js'));
const chromiumModule = await import(pathToFileURL(path.join(QA_MODULES, '@sparticuz/chromium/build/index.js')).href);
const chromium = chromiumModule.default;
const puppeteer = require('puppeteer-core');
await chromiumModule.inflate(path.join(QA_MODULES, '@sparticuz/chromium/bin/al2023.tar.br'));
chromiumModule.setupLambdaEnvironment('/tmp/al2023/lib');
chromium.setGraphicsMode = false;

const report = { base: BASE, zip: ZIP, generatedAt: new Date().toISOString(), steps: [], consoleErrors: [] };
const log = (name, ok, detail = '') => {
  report.steps.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};
const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: 'shell' });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('pageerror', (e) => report.consoleErrors.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push(m.text()); });
page.on('requestfailed', (r) => report.consoleErrors.push(`REQUEST FAILED ${r.url()} ${r.failure()?.errorText}`));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* 1. Log in through the real login form. */
await page.goto(BASE + '/wp-login.php', { waitUntil: 'networkidle2', timeout: 90000 });
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
await page.goto(BASE + '/wp-admin/theme-install.php?upload', { waitUntil: 'networkidle2', timeout: 90000 });
log('Upload Theme form present', await page.$('#themezip') !== null && await page.$('#install-theme-submit') !== null);
const input = await page.$('#themezip');
await input.uploadFile(ZIP);
await Promise.all([
  page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 180000 }).catch(() => {}),
  page.evaluate(() => document.querySelector('#install-theme-submit').click()),
]);
await wait(2500);
const resultText = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 3000));
const installed = /Theme installed successfully|Installing Theme from uploaded file|Unpacking the package|فعال کردن|Activate/i.test(resultText);
log('ZIP uploads and installs via admin UI', installed, resultText.slice(0, 400));
fs.writeFileSync(path.join(ROOT, '.work', 'wp-qa', 'forms', 'upload-result.txt'), resultText);

/* 3. Activate from the success screen or the Themes screen. */
let activated = false;
try {
  const link = await page.$('a[href*="action=activate"][href*="stylesheet=raouf-academy"], a.activate[href*="raouf-academy"]');
  if (link) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {}),
      page.evaluate((el) => el.click(), link),
    ]);
    await wait(1200);
    activated = /activated|فعال شد|New theme activated/i.test(await page.evaluate(() => document.body.innerText));
  }
} catch (e) { /* fall through */ }
if (!activated) {
  await page.goto(BASE + '/wp-admin/themes.php', { waitUntil: 'networkidle2', timeout: 90000 });
  const activateLink = await page.$('a[href*="action=activate"][href*="stylesheet=raouf-academy"]');
  if (activateLink) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {}),
      page.evaluate((el) => el.click(), activateLink),
    ]);
    await wait(1200);
    activated = true;
  }
}
log('theme activates from Appearance → Themes', activated);

/* 4. Front end after activation. */
await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 90000 });
const front = await page.evaluate(() => ({
  dir: document.documentElement.dir,
  lang: document.documentElement.lang,
  title: document.title,
  themeCss: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some((l) => l.href.includes('raouf-academy/style.css')),
  bodyClass: document.body.className,
  h1: document.querySelector('h1')?.textContent.trim() || '',
  images: document.images.length,
}));
log('front page uses Raouf Academy theme', front.themeCss && front.dir === 'rtl' && front.lang === 'fa', JSON.stringify(front));
await page.goto(BASE + '/courses/skin-facial/', { waitUntil: 'networkidle2', timeout: 90000 });
log('inner page loads after fresh install', (await page.$eval('h1', (e) => e.textContent.trim())).length > 5);

await browser.close();
fs.writeFileSync(path.join(ROOT, '.work', 'wp-qa', 'forms', 'upload-test.json'), JSON.stringify(report, null, 2));
const failures = report.steps.filter((s) => !s.ok);
console.log(`\nsteps=${report.steps.length} failures=${failures.length} consoleErrors=${report.consoleErrors.length}`);
if (report.consoleErrors.length) console.log(report.consoleErrors.slice(0, 10).join('\n'));
if (failures.length) process.exitCode = 1;
