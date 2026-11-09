/**
 * Stage C — behaviour parity for gallery filters, lightbox (mouse + keyboard
 * ArrowLeft/ArrowRight/Escape + close button) and every FAQ accordion.
 *
 * The exact same interaction sequence is executed on the original static
 * site and on WordPress; the resulting state snapshots must be identical.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ROOT = '/home/user/raouf';
const ORIG = process.env.ORIG_URL || 'http://127.0.0.1:3000';
const WP = process.env.WP_URL || 'http://127.0.0.1:9400';
const OUT = path.join(ROOT, 'wordpress-conversion', 'qa', 'results', 'stage-C-behaviour.json');
const QA_MODULES = path.join(ROOT, '.work', 'wp-qa', 'node_modules');
const require = createRequire(path.join(QA_MODULES, 'noop.js'));

const chromiumModule = await import(pathToFileURL(path.join(QA_MODULES, '@sparticuz/chromium/build/index.js')).href);
const chromium = chromiumModule.default;
const puppeteer = require('puppeteer-core');
await chromiumModule.inflate(path.join(QA_MODULES, '@sparticuz/chromium/bin/al2023.tar.br'));
chromiumModule.setupLambdaEnvironment('/tmp/al2023/lib');
chromium.setGraphicsMode = false;

const LIGHTBOX_ROUTES = ['/', '/courses/skin-facial/', '/courses/medical-emergency/',
  '/courses/pharmacy-technician/', '/courses/massage-relaxation/', '/gallery/'];
const FAQ_ROUTES = ['/', '/courses/skin-facial/', '/courses/medical-emergency/',
  '/courses/pharmacy-technician/', '/courses/massage-relaxation/'];

const report = { stage: 'C', orig: ORIG, wp: WP, checks: [], consoleErrors: [], sequences: [] };
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
}

async function open(base, url, label) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768, deviceScaleFactor: 1 });
  watch(page, label);
  await page.goto(base + url, { waitUntil: 'networkidle2', timeout: 120000 });
  await page.evaluate(() => document.fonts?.ready);
  await wait(250);
  return page;
}

const basename = (s) => (s || '').split('/').pop().split('?')[0];

/* ------------------------------------------------------------- lightbox */
async function lightboxSequence(page) {
  const out = {};
  out.itemCount = await page.$$eval('[data-lightbox-item]', (els) => els.length);
  out.hasDialog = await page.$eval('#lightbox', (d) => !!d && typeof d.showModal === 'function').catch(() => false);
  const first = await page.$('[data-lightbox-item]');
  await first.evaluate((el) => el.click());
  await wait(220);
  const snap = async () => page.evaluate(() => {
    const img = document.querySelector('#lightboxImage');
    const image = (img.getAttribute('src') || '').split('/').pop().split('?')[0];
    const alt = img.getAttribute('alt') || '';
    const caption = document.querySelector('#lightboxCaption').textContent;
    return { open: document.querySelector('#lightbox').open, image, alt, caption, state: image + '|' + alt + '|' + caption };
  });
  out.open = await snap();
  await page.keyboard.press('ArrowLeft'); await wait(160); out.arrowLeft = await snap();
  await page.keyboard.press('ArrowRight'); await wait(160); out.arrowRight = await snap();
  await page.click('[data-lightbox-next]'); await wait(160); out.nextButton = await snap();
  await page.click('[data-lightbox-prev]'); await wait(160); out.prevButton = await snap();
  await page.keyboard.press('Escape'); await wait(200); out.escape = await snap();
  await page.evaluate(() => document.querySelector('[data-lightbox-item]').click()); await wait(200);
  out.reopened = await snap();
  await page.click('[data-lightbox-close]'); await wait(200); out.closeButton = await snap();
  out.valid = out.hasDialog && out.open.open === true && out.itemCount > 1
    && out.open.state !== out.arrowLeft.state
    && out.arrowRight.state === out.open.state
    && out.nextButton.state !== out.prevButton.state
    && out.escape.open === false && out.reopened.open === true && out.closeButton.open === false;
  return out;
}

for (const route of LIGHTBOX_ROUTES) {
  const a = await open(ORIG, route, `orig:lightbox:${route}`);
  const b = await open(WP, route, `wp:lightbox:${route}`);
  const oa = await lightboxSequence(a);
  const ob = await lightboxSequence(b);
  const same = JSON.stringify(oa) === JSON.stringify(ob);
  report.sequences.push({ type: 'lightbox', route, original: oa, wordpress: ob, identical: same });
  check(`lightbox + keyboard + Escape: ${route}`, same && oa.valid && ob.valid,
    `items=${oa.itemCount}/${ob.itemCount} orig=[${oa.open.image} -> ${oa.arrowLeft.image} -> esc ${oa.escape.open}] wp=[${ob.open.image} -> ${ob.arrowLeft.image} -> esc ${ob.escape.open}]`);
  await a.close(); await b.close();
}

/* ------------------------------------------------------- gallery filters */
{
  const filterSequence = async (page) => {
    const buttons = await page.$$eval('.filter-btn', (els) => els.map((e) => e.getAttribute('data-filter')));
    const out = { buttons, steps: [] };
    for (const f of buttons) {
      await page.click(`[data-filter="${f}"]`);
      await wait(140);
      out.steps.push(await page.evaluate(() => ({
        active: document.querySelector('.filter-btn.is-active')?.getAttribute('data-filter'),
        pressed: Array.from(document.querySelectorAll('.filter-btn')).map((b) => b.getAttribute('aria-pressed')).join(','),
        visible: Array.from(document.querySelectorAll('#galleryGrid [data-lightbox-item]')).filter((t) => getComputedStyle(t).display !== 'none' && !t.hidden).length,
        total: document.querySelectorAll('#galleryGrid [data-lightbox-item]').length,
        countLabel: document.querySelector('#galleryCount')?.textContent || null,
        emptyHidden: document.querySelector('#galleryEmpty')?.hidden ?? null,
      })));
    }
    out.valid = out.steps.length === 6 && out.steps[0].visible === out.steps[0].total
      && out.steps.slice(1).every((s) => s.visible > 0 && s.visible < s.total)
      && out.steps.every((s, i) => s.active === out.buttons[i]);
    return out;
  };
  const a = await open(ORIG, '/gallery/', 'orig:filters');
  const b = await open(WP, '/gallery/', 'wp:filters');
  const oa = await filterSequence(a);
  const ob = await filterSequence(b);
  const same = JSON.stringify(oa) === JSON.stringify(ob);
  report.sequences.push({ type: 'gallery-filters', route: '/gallery/', original: oa, wordpress: ob, identical: same });
  check('all 6 gallery filters + count label + aria-pressed', same && oa.valid && ob.valid,
    `visible orig=${oa.steps.map((s) => s.visible).join(',')} wp=${ob.steps.map((s) => s.visible).join(',')}`);
  await a.close(); await b.close();
}

/* ------------------------------------------------------------ FAQ accordions */
{
  const faqSequence = async (page) => {
    const out = {};
    out.details = await page.$$eval('#main details', (els) => els.map((d) => ({
      faq: d.classList.contains('faq-item'),
      name: d.getAttribute('name'),
      open: d.open,
      summary: (d.querySelector('summary')?.textContent || '').trim().slice(0, 80),
    })));
    const items = out.details.filter((d) => d.faq);
    out.faqCount = items.length;
    out.initialOpen = items.map((d) => d.open);
    const states = async () => page.$$eval('#main details.faq-item', (els) => els.map((d) => d.open));
    out.afterClickSecond = null; out.afterClickThird = null; out.afterClickThirdAgain = null;
    if (items.length >= 2) {
      await page.evaluate(() => document.querySelectorAll('#main details.faq-item')[1].querySelector('summary').click());
      await wait(180);
      out.afterClickSecond = await states();
    }
    if (items.length >= 3) {
      await page.evaluate(() => document.querySelectorAll('#main details.faq-item')[2].querySelector('summary').click());
      await wait(180);
      out.afterClickThird = await states();
      await page.evaluate(() => document.querySelectorAll('#main details.faq-item')[2].querySelector('summary').click());
      await wait(180);
      out.afterClickThirdAgain = await states();
    }
    out.valid = out.faqCount > 0 && out.afterClickSecond && out.afterClickSecond.filter(Boolean).length === 1
      && out.afterClickSecond[1] === true && out.afterClickThird.filter(Boolean).length === 1
      && out.afterClickThird[2] === true
      && items.every((d) => d.name && d.summary);
    return out;
  };
  for (const route of FAQ_ROUTES) {
    const a = await open(ORIG, route, `orig:faq:${route}`);
    const b = await open(WP, route, `wp:faq:${route}`);
    const oa = await faqSequence(a);
    const ob = await faqSequence(b);
    const same = JSON.stringify(oa) === JSON.stringify(ob);
    report.sequences.push({ type: 'faq', route, original: oa, wordpress: ob, identical: same });
    check(`FAQ accordion exclusive behaviour: ${route}`, same && oa.valid && ob.valid,
      `count=${oa.faqCount}/${ob.faqCount} names=${oa.details.filter((d) => d.faq).map((d) => d.name).join(',')}`);
    await a.close(); await b.close();
  }
}

await browser.close();
fs.mkdirSync(path.dirname(OUT), { recursive: true });
report.summary = {
  checks: report.checks.length, failures: report.checks.filter((c) => !c.ok).length,
  parity_sequences: report.sequences.length, identical_sequences: report.sequences.filter((s) => s.identical).length,
  lightbox_routes: LIGHTBOX_ROUTES.length, faq_routes: FAQ_ROUTES.length,
  consoleErrors: report.consoleErrors.length,
};
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(`\nchecks=${report.checks.length} failures=${report.summary.failures} parity=${report.summary.identical_sequences}/${report.sequences.length} consoleErrors=${report.consoleErrors.length}`);
if (report.consoleErrors.length) console.log(report.consoleErrors.slice(0, 20).join('\n'));
if (report.summary.failures) process.exitCode = 1;
