/** Correction v1.1.0 — real Chromium AJAX/validation/double-submit/failure tests. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ROOT = '/home/user/raouf';
const BASE = process.env.BROWSER_URL || 'http://127.0.0.1:9422';
const FAILURE = process.env.FAILURE_URL || 'http://127.0.0.1:9423';
const OUT = path.join(ROOT, 'wordpress-conversion', 'qa', 'results', 'v110-browser.json');
const QA_MODULES = path.join(ROOT, '.work', 'wp-qa', 'node_modules');
const require = createRequire(path.join(QA_MODULES, 'noop.js'));
const chromiumModule = await import(pathToFileURL(path.join(QA_MODULES, '@sparticuz/chromium/build/index.js')).href);
const chromium = chromiumModule.default;
const puppeteer = require('puppeteer-core');
await chromiumModule.inflate(path.join(QA_MODULES, '@sparticuz/chromium/bin/al2023.tar.br'));
chromiumModule.setupLambdaEnvironment('/tmp/al2023/lib');
chromium.setGraphicsMode = false;

const report = { generatedAt: new Date().toISOString(), base: BASE, failure: FAILURE, checks: [], consoleErrors: [] };
const check = (name, ok, detail = '') => {
  const shown = typeof detail === 'string' ? detail : JSON.stringify(detail);
  report.checks.push({ name, ok: Boolean(ok), detail: shown });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${shown ? ' — ' + shown.slice(0, 260) : ''}`);
};
const wait = ms => new Promise(r => setTimeout(r, ms));
const safeJson = s => { try { return JSON.parse(s); } catch (e) { return {}; } };
const rid = String(Date.now()).slice(-6);
const faDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const toFa = s => s.replace(/\d/g, d => faDigits[Number(d)]);
const regPhone = toFa('09146' + rid);
const contactPhone = '09147' + rid;
const failurePhone = '09149' + rid;
/* validName() intentionally rejects ASCII digits; use Persian digits in names. */
const nameSuffix = toFa(rid);
function watch(page, label) {
  page.on('console', m => {
    if (m.type() !== 'error') return;
    /* The deliberate storage-failure test intentionally receives HTTP 500.
       Chromium logs that expected resource status; it is not a JS defect. */
    if (label === 'storage-failure' && /status of 500|Internal Server Error/.test(m.text())) return;
    report.consoleErrors.push(`${label}: console ${m.text()}`);
  });
  page.on('pageerror', e => report.consoleErrors.push(`${label}: PAGEERROR ${e.message}`));
  page.on('requestfailed', r => report.consoleErrors.push(`${label}: REQUESTFAILED ${r.url()} ${r.failure()?.errorText || ''}`));
}
async function open(url, base, label) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
  watch(page, label);
  const res = await page.goto(base + url, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
  await wait(300);
  return { page, status: res.status() };
}
async function reloadWatch(page, base, url, label) {
  const navigations = [];
  const handler = frame => { if (frame === page.mainFrame()) navigations.push(frame.url()); };
  page.on('framenavigated', handler);
  const before = page.url();
  return { before, navigations, handler };
}

const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: 'shell' });

/* 1. Registration: client-side required validation, no network POST. */
{
  const { page, status } = await open('/register/', BASE, 'register-client-validation');
  let posts = 0;
  page.on('request', r => { if (r.method() === 'POST' && r.url().includes('/api/registrations')) posts++; });
  const urlBefore = page.url();
  await page.click('#registerForm [data-submit]');
  await wait(700);
  const state = await page.evaluate(() => ({
    alert: document.querySelector('#registerForm')?.closest('.form-card')?.querySelector('[data-form-alert]')?.textContent || '',
    alertHidden: document.querySelector('#registerForm')?.closest('.form-card')?.querySelector('[data-form-alert]')?.hidden,
    nameError: document.querySelector('[data-error-for="name"]')?.textContent || '',
    phoneError: document.querySelector('[data-error-for="phone"]')?.textContent || '',
    courseError: document.querySelector('[data-error-for="course"]')?.textContent || '',
    formHidden: document.querySelector('#registerForm')?.hidden,
    url: location.href,
  }));
  check('client validation blocks incomplete registration without network POST',
    status === 200 && posts === 0 && !state.alertHidden &&
    state.alert.includes('لطفاً موارد') && state.nameError && state.phoneError && state.courseError &&
    !state.formHidden && state.url === urlBefore,
    { posts, alert: state.alert, nameError: state.nameError, phoneError: state.phoneError, courseError: state.courseError });
  await page.close();
}

/* 2. Registration: double click -> one POST, no reload, success after DB write. */
{
  const { page, status } = await open('/register/', BASE, 'register-double-submit');
  await page.setRequestInterception(true);
  let posts = 0;
  const responses = [];
  page.on('request', r => {
    if (r.method() === 'POST' && r.url().includes('/api/registrations')) {
      posts++;
      setTimeout(() => r.continue().catch(() => {}), 450);
    } else {
      r.continue().catch(() => {});
    }
  });
  page.on('response', async r => {
    if (r.request().method() === 'POST' && r.url().includes('/api/registrations')) {
      try { responses.push({ status: r.status(), body: await r.text() }); } catch (e) { responses.push({ status: r.status(), body: '' }); }
    }
  });
  const nav = await reloadWatch(page, BASE, '/register/', 'register-double-submit');
  const urlBefore = page.url();
  await page.type('#registerForm #name', 'حسین محمدی مرورگر ' + nameSuffix);
  await page.type('#registerForm #phone', regPhone);
  await page.select('#registerForm #course', 'medical-emergency');
  await page.type('#registerForm #message', 'تست ارسال دوبار کلیک بدون بارگذاری مجدد صفحه ' + rid);
  await page.evaluate(() => {
    const b = document.querySelector('#registerForm [data-submit]');
    b.click();
    b.click();
  });
  let disabledSeen = false;
  try {
    await page.waitForFunction(() => document.querySelector('#registerForm [data-submit]')?.disabled === true, { timeout: 2000 });
    disabledSeen = true;
  } catch (e) { disabledSeen = false; }
  let success = false;
  let ref = '';
  try {
    await page.waitForFunction(() => {
      const f = document.querySelector('#registerForm');
      const s = f?.closest('.form-card')?.querySelector('[data-form-success]');
      return s && !s.hidden;
    }, { timeout: 30000 });
    success = true;
    ref = await page.$eval('#registerForm ~ [data-form-success] [data-ref]', e => e.textContent.trim()).catch(() => '');
  } catch (e) { success = false; }
  const state = await page.evaluate(() => ({
    url: location.href,
    formHidden: document.querySelector('#registerForm')?.hidden,
    successHidden: document.querySelector('#registerForm')?.closest('.form-card')?.querySelector('[data-form-success]')?.hidden,
    alertHidden: document.querySelector('#registerForm')?.closest('.form-card')?.querySelector('[data-form-alert]')?.hidden,
  }));
  check('double-click produces exactly one registration POST',
    posts === 1 && disabledSeen && responses.length === 1 && responses[0].status === 201 &&
    safeJson(responses[0].body).storage === 'plugin',
    { posts, disabledSeen, responses });
  check('registration success without page reload',
    status === 200 && success && !!ref && state.url === urlBefore &&
    nav.navigations.length === 0 && state.formHidden && !state.successHidden && state.alertHidden,
    { ref, urlBefore, urlAfter: state.url, navigations: nav.navigations.length, formHidden: state.formHidden, successHidden: state.successHidden });
  page.off('framenavigated', nav.handler);
  await page.close();
}

/* 3. Contact: client-side validation of all fields, no network POST. */
{
  const { page, status } = await open('/contact/', BASE, 'contact-client-validation');
  let posts = 0;
  page.on('request', r => { if (r.method() === 'POST' && r.url().includes('/api/contact')) posts++; });
  const urlBefore = page.url();
  await page.type('#contactForm #name', 'سارا کریمی ' + nameSuffix);
  await page.type('#contactForm #phone', contactPhone);
  await page.type('#contactForm #email', 'bad@@');
  await page.type('#contactForm #subject', '');
  await page.type('#contactForm #message', 'کوتاه');
  await page.click('#contactForm [data-submit]');
  await wait(700);
  const state = await page.evaluate(() => ({
    alert: document.querySelector('#contactForm')?.closest('.form-card')?.querySelector('[data-form-alert]')?.textContent || '',
    alertHidden: document.querySelector('#contactForm')?.closest('.form-card')?.querySelector('[data-form-alert]')?.hidden,
    emailError: document.querySelector('[data-error-for="email"]')?.textContent || '',
    subjectError: document.querySelector('[data-error-for="subject"]')?.textContent || '',
    messageError: document.querySelector('[data-error-for="message"]')?.textContent || '',
    emailValue: document.querySelector('#contactForm #email')?.value,
    messageValue: document.querySelector('#contactForm #message')?.value,
    formHidden: document.querySelector('#contactForm')?.hidden,
    url: location.href,
  }));
  check('client validation blocks invalid contact without network POST',
    status === 200 && posts === 0 && !state.alertHidden && state.alert.includes('لطفاً موارد') &&
    state.emailError && state.subjectError && state.messageError && !state.formHidden &&
    state.emailValue === 'bad@@' && state.messageValue === 'کوتاه' && state.url === urlBefore,
    { posts, alert: state.alert, emailError: state.emailError, subjectError: state.subjectError, messageError: state.messageError });
  await page.close();
}

/* 4. Contact: valid AJAX success, all fields, no reload. */
{
  const { page, status } = await open('/contact/', BASE, 'contact-ajax-success');
  let posts = 0;
  const responses = [];
  page.on('request', r => { if (r.method() === 'POST' && r.url().includes('/api/contact')) posts++; });
  page.on('response', async r => {
    if (r.request().method() === 'POST' && r.url().includes('/api/contact')) {
      try { responses.push({ status: r.status(), body: await r.text() }); } catch (e) { responses.push({ status: r.status(), body: '' }); }
    }
  });
  const nav = await reloadWatch(page, BASE, '/contact/', 'contact-ajax-success');
  const urlBefore = page.url();
  await page.type('#contactForm #name', 'سارا کریمی مرورگر ' + nameSuffix);
  await page.type('#contactForm #phone', contactPhone);
  await page.type('#contactForm #email', 'sara.v110.' + rid + '@example.test');
  await page.type('#contactForm #subject', 'پرسش تست مرورگر ' + rid);
  await page.type('#contactForm #message', 'این پیام معتبر برای تست AJAX فرم تماس بدون بارگذاری مجدد صفحه است ' + rid);
  await page.click('#contactForm [data-submit]');
  let success = false;
  let ref = '';
  try {
    await page.waitForFunction(() => {
      const f = document.querySelector('#contactForm');
      const s = f?.closest('.form-card')?.querySelector('[data-form-success]');
      return s && !s.hidden;
    }, { timeout: 30000 });
    success = true;
    ref = await page.$eval('#contactForm ~ [data-form-success] [data-ref]', e => e.textContent.trim()).catch(() => '');
  } catch (e) { success = false; }
  const state = await page.evaluate(() => ({
    url: location.href,
    formHidden: document.querySelector('#contactForm')?.hidden,
    successHidden: document.querySelector('#contactForm')?.closest('.form-card')?.querySelector('[data-form-success]')?.hidden,
    alertHidden: document.querySelector('#contactForm')?.closest('.form-card')?.querySelector('[data-form-alert]')?.hidden,
  }));
  check('contact success without page reload',
    status === 200 && posts === 1 && success && !!ref && responses.length === 1 &&
    responses[0].status === 201 && safeJson(responses[0].body).storage === 'plugin' &&
    state.url === urlBefore && nav.navigations.length === 0 && state.formHidden &&
    !state.successHidden && state.alertHidden,
    { posts, ref, responses, urlBefore, urlAfter: state.url, navigations: nav.navigations.length });
  page.off('framenavigated', nav.handler);
  await page.close();
}

/* 5. Deliberate DB failure: no fake success, real Persian error, values preserved. */
{
  const { page, status } = await open('/contact/', FAILURE, 'storage-failure');
  let posts = 0;
  const responses = [];
  page.on('request', r => { if (r.method() === 'POST' && r.url().includes('/api/contact')) posts++; });
  page.on('response', async r => {
    if (r.request().method() === 'POST' && r.url().includes('/api/contact')) {
      try { responses.push({ status: r.status(), body: await r.text() }); } catch (e) { responses.push({ status: r.status(), body: '' }); }
    }
  });
  const nav = await reloadWatch(page, FAILURE, '/contact/', 'storage-failure');
  const urlBefore = page.url();
  const values = { name: 'خطای ذخیره تست ' + nameSuffix, phone: failurePhone, email: 'fail.v110.' + rid + '@example.test',
                   subject: 'تست خطای دیتابیس ' + rid, message: 'این پیام نباید موفقیت کاذب نمایش دهد و مقادیر باید حفظ شوند ' + rid };
  await page.type('#contactForm #name', values.name);
  await page.type('#contactForm #phone', values.phone);
  await page.type('#contactForm #email', values.email);
  await page.type('#contactForm #subject', values.subject);
  await page.type('#contactForm #message', values.message);
  await page.click('#contactForm [data-submit]');
  let alertShown = false;
  try {
    await page.waitForFunction(() => {
      const a = document.querySelector('#contactForm')?.closest('.form-card')?.querySelector('[data-form-alert]');
      return a && !a.hidden && a.classList.contains('is-error');
    }, { timeout: 30000 });
    alertShown = true;
  } catch (e) { alertShown = false; }
  const state = await page.evaluate(() => ({
    url: location.href,
    alert: document.querySelector('#contactForm')?.closest('.form-card')?.querySelector('[data-form-alert]')?.textContent || '',
    formHidden: document.querySelector('#contactForm')?.hidden,
    successHidden: document.querySelector('#contactForm')?.closest('.form-card')?.querySelector('[data-form-success]')?.hidden,
    name: document.querySelector('#contactForm #name')?.value,
    phone: document.querySelector('#contactForm #phone')?.value,
    email: document.querySelector('#contactForm #email')?.value,
    subject: document.querySelector('#contactForm #subject')?.value,
    message: document.querySelector('#contactForm #message')?.value,
  }));
  const realError = state.alert.includes('ذخیره') || state.alert.includes('خطا') || state.alert.includes('کد');
  check('storage failure returns real error and keeps entered values',
    status === 200 && posts === 1 && responses.length === 1 && responses[0].status === 500 &&
    safeJson(responses[0].body).ok === false && alertShown && realError &&
    !state.formHidden && state.successHidden && state.url === urlBefore && nav.navigations.length === 0 &&
    state.name === values.name && state.phone === values.phone && state.email === values.email &&
    state.subject === values.subject && state.message === values.message,
    { posts, responses, alert: state.alert, alertShown, formHidden: state.formHidden, successHidden: state.successHidden });
  page.off('framenavigated', nav.handler);
  await page.close();
}

await browser.close();
report.summary = {
  checks: report.checks.length,
  PASS: report.checks.filter(c => c.ok).length,
  FAIL: report.checks.filter(c => !c.ok).length,
  consoleErrors: report.consoleErrors.length,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log('\nbrowser summary', report.summary);
if (report.summary.FAIL || report.summary.consoleErrors) {
  console.log(report.consoleErrors.slice(0, 20).join('\n'));
  process.exitCode = 1;
}
