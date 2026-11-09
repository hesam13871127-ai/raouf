/**
 * Stage C — route-by-route real-browser visual comparison.
 *
 * Captures ALL 11 original routes (including /404/) on the original static
 * site and on WordPress at one desktop and one mobile viewport. This is the
 * Stage C comparison; the full six-viewport / 60-pair suite belongs to Stage F
 * and is deliberately NOT run here.
 *
 * Screenshots and the capture report are QA artefacts under
 * .work/wp-qa/stage-c-screens (git-ignored).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ROOT = '/home/user/raouf';
const ORIG = process.env.ORIG_URL || 'http://127.0.0.1:3000';
const WP = process.env.WP_URL || 'http://127.0.0.1:9400';
const QA_MODULES = path.join(ROOT, '.work', 'wp-qa', 'node_modules');
const OUT = path.join(ROOT, '.work', 'wp-qa', 'stage-c-screens');
const require = createRequire(path.join(QA_MODULES, 'noop.js'));

const chromiumModule = await import(pathToFileURL(path.join(QA_MODULES, '@sparticuz/chromium/build/index.js')).href);
const chromium = chromiumModule.default;
const puppeteer = require('puppeteer-core');
await chromiumModule.inflate(path.join(QA_MODULES, '@sparticuz/chromium/bin/al2023.tar.br'));
chromiumModule.setupLambdaEnvironment('/tmp/al2023/lib');
chromium.setGraphicsMode = false;

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
  { name: '404', url: '/404/' },
];
const VIEWPORTS = [
  { key: '1366x768', width: 1366, height: 768, isMobile: false },
  { key: '390x844', width: 390, height: 844, isMobile: true },
];

fs.mkdirSync(OUT, { recursive: true });
const report = {
  stage: 'C', generatedAt: new Date().toISOString(), orig: ORIG, wp: WP,
  viewports: VIEWPORTS, pages: PAGES, pairs: [], consoleErrors: [], failedRequests: [],
};
const browser = await puppeteer.launch({
  args: chromium.args, executablePath: await chromium.executablePath(), headless: 'shell',
});

function watch(page, label) {
  page.on('console', (m) => {
    if (m.type() === 'error') report.consoleErrors.push(`${label}: ${m.text()}`);
  });
  page.on('pageerror', (e) => report.consoleErrors.push(`${label}: PAGEERROR ${e.message}`));
  page.on('requestfailed', (r) => report.failedRequests.push(`${label}: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => {
    if (r.status() >= 400) report.failedRequests.push(`${label}: HTTP ${r.status()} ${r.url()}`);
  });
}

async function capture(base, pageDef, file, vp, label) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: vp.isMobile, hasTouch: vp.isMobile });
  watch(page, label);
  const response = await page.goto(base + pageDef.url, { waitUntil: 'networkidle2', timeout: 120000 });
  const html = await response.text();
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    const h = root.scrollHeight;
    for (let y = 0; y < h + 700; y += 450) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
    root.style.scrollBehavior = prev;
    document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });
  });
  await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0), { timeout: 60000 });
  await page.waitForFunction(() => Array.from(document.querySelectorAll('.reveal')).every((e) => getComputedStyle(e).opacity === '1'), { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 900));
  const info = await page.evaluate((v) => ({
    title: document.title,
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    computedDirection: getComputedStyle(document.body).direction,
    overflowX: document.documentElement.scrollWidth - Math.max(v.width, window.innerWidth),
    brokenImages: Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
    imageCount: document.images.length,
    revealHidden: Array.from(document.querySelectorAll('.reveal')).filter((e) => getComputedStyle(e).opacity === '0').length,
    fontFamily: getComputedStyle(document.body).fontFamily,
    vazirmatnLoaded: document.fonts.check('16px "Vazirmatn"') || document.fonts.check('16px Vazirmatn'),
    shared: {
      header: !!document.querySelector('.site-header'),
      topbar: !!document.querySelector('.header-topbar'),
      footer: !!document.querySelector('.site-footer'),
      mobileNav: !!document.querySelector('#mobileNav'),
      callBar: !!document.querySelector('.mobile-call-bar'),
      callBarDisplay: document.querySelector('.mobile-call-bar') ? getComputedStyle(document.querySelector('.mobile-call-bar')).display : 'missing',
      backToTop: !!document.querySelector('.back-to-top'),
      lightbox: !!document.querySelector('#lightbox'),
    },
    phpErrors: [],
  }), vp);
  // Sticky overlays are verified separately; hide them only for pixel equality.
  await page.addStyleTag({ content: '.mobile-call-bar,.back-to-top{display:none !important}' });
  await page.screenshot({ path: file, type: 'jpeg', quality: 90, fullPage: true });
  await page.close();
  return { status: response.status(), ...info, phpErrorStrings: (html.match(/(?:Fatal error|Parse error|Warning|Notice|Deprecated):[^<\n]{0,120}/g) || []) };
}

for (const vp of VIEWPORTS) {
  for (const p of PAGES) {
    const a = path.join(OUT, `orig-${vp.key}-${p.name}.jpg`);
    const b = path.join(OUT, `wp-${vp.key}-${p.name}.jpg`);
    const oa = await capture(ORIG, p, a, vp, `orig:${vp.key}:${p.name}`);
    const ob = await capture(WP, p, b, vp, `wp:${vp.key}:${p.name}`);
    report.pairs.push({ viewport: vp.key, page: p.name, url: p.url, origFile: a, wpFile: b, orig: oa, wp: ob });
    console.log(`[${vp.key}] ${p.name.padEnd(30)} ` +
      `status=${oa.status}/${ob.status} img=${oa.imageCount}/${ob.imageCount} broken=${oa.brokenImages.length}/${ob.brokenImages.length} ` +
      `overflow=${oa.overflowX}/${ob.overflowX} hidden=${oa.revealHidden}/${ob.revealHidden} font=${ob.vazirmatnLoaded}`);
  }
}

await browser.close();
fs.writeFileSync(path.join(OUT, 'capture-report.json'), JSON.stringify(report, null, 2));
console.log(`pairs=${report.pairs.length} consoleErrors=${report.consoleErrors.length} failedRequests=${report.failedRequests.length}`);
if (report.consoleErrors.length) console.log(report.consoleErrors.slice(0, 20).join('\n'));
if (report.failedRequests.length) console.log(report.failedRequests.slice(0, 20).join('\n'));
