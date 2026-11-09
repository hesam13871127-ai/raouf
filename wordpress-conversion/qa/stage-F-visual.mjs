/**
 * Stage F — complete real-browser visual comparison.
 *
 * 11 routes x 6 viewports = 66 pairs. The 60 mandated pairs are the 10 content
 * routes x 6 viewports; the additional 6 pairs cover the 404 route. Both the
 * authoritative static site and the final ZIP-installed WordPress site are
 * captured with identical Chromium settings, full-page JPEG quality 90.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ROOT = '/home/user/raouf';
const ORIG = process.env.ORIG_URL || 'http://127.0.0.1:3000';
const WP = process.env.WP_URL || 'http://127.0.0.1:9411';
const OUT = process.env.SHOT_DIR || path.join(ROOT, '.work', 'wp-qa', 'stage-f-screens');
const QA_MODULES = path.join(ROOT, '.work', 'wp-qa', 'node_modules');
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
const MANDATED = new Set(PAGES.slice(0, 10).map((p) => p.name));
const VIEWPORTS = [
  { key: '1920x1080', width: 1920, height: 1080, isMobile: false, kind: 'desktop' },
  { key: '1366x768', width: 1366, height: 768, isMobile: false, kind: 'desktop' },
  { key: '1024x768', width: 1024, height: 768, isMobile: false, kind: 'desktop' },
  { key: '768x1024', width: 768, height: 1024, isMobile: true, kind: 'mobile' },
  { key: '390x844', width: 390, height: 844, isMobile: true, kind: 'mobile' },
  { key: '360x800', width: 360, height: 800, isMobile: true, kind: 'mobile' },
];

fs.mkdirSync(OUT, { recursive: true });
const report = {
  stage: 'F', generatedAt: new Date().toISOString(), orig: ORIG, wp: WP,
  viewports: VIEWPORTS, pages: PAGES, pairs: [], consoleErrors: [], failedRequests: [], httpErrors: [],
};
const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: 'shell' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function watch(page, label) {
  page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push(`${label}: ${m.text()} @ ${m.location()?.url || ''}`); });
  page.on('pageerror', (e) => report.consoleErrors.push(`${label}: PAGEERROR ${e.message}`));
  page.on('requestfailed', (r) => report.failedRequests.push(`${label}: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) report.httpErrors.push(`${label}: HTTP ${r.status()} ${r.url()}`); });
}

async function capture(base, pageDef, file, vp, label) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: vp.isMobile, hasTouch: vp.isMobile });
  watch(page, label);
  let response;
  for (let i = 0; i < 5; i++) {
    try { response = await page.goto(base + pageDef.url, { waitUntil: 'networkidle2', timeout: 120000 }); break; }
    catch (e) { if (i === 4) throw e; await wait(2500); }
  }
  const html = await response.text();
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    for (let pass = 0; pass < 3; pass++) {
      const h = root.scrollHeight;
      for (let y = 0; y < h + 700; y += 450) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    }
    window.scrollTo(0, 0);
    root.style.scrollBehavior = prev;
    document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });
  });
  try { await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0), { timeout: 60000 }); } catch (e) { /* recorded below */ }
  try { await page.waitForFunction(() => Array.from(document.querySelectorAll('.reveal')).every((e) => getComputedStyle(e).opacity === '1'), { timeout: 30000 }); } catch (e) { /* recorded below */ }
  await wait(700);
  const info = await page.evaluate(() => ({
    title: document.title,
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    computedDirection: getComputedStyle(document.body).direction,
    overflowX: document.documentElement.scrollWidth - Math.max(window.innerWidth, document.documentElement.clientWidth),
    brokenImages: Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
    imageCount: document.images.length,
    revealHidden: Array.from(document.querySelectorAll('.reveal')).filter((e) => getComputedStyle(e).opacity === '0').length,
    // alt="" is valid for a decorative image (lightbox placeholder).
    missingAlt: Array.from(document.images).filter((i) => !i.hasAttribute('alt')).length,
    decorativeEmptyAlt: Array.from(document.images).filter((i) => i.getAttribute('alt') === '').length,
    fontFamily: getComputedStyle(document.body).fontFamily,
    vazirmatnLoaded: document.fonts.check('16px "Vazirmatn"') || document.fonts.check('16px Vazirmatn'),
  }));
  await page.addStyleTag({ content: '.mobile-call-bar,.back-to-top{display:none !important}' });
  await page.screenshot({ path: file, type: 'jpeg', quality: 90, fullPage: true });
  await page.close();
  return { status: response.status(), ...info,
    phpErrorStrings: (html.match(/(?:Fatal error|Parse error|Warning|Notice|Deprecated):[^<\n]{0,120}/g) || []) };
}

for (const vp of VIEWPORTS) {
  for (const p of PAGES) {
    const a = path.join(OUT, `orig-${vp.key}-${p.name}.jpg`);
    const b = path.join(OUT, `wp-${vp.key}-${p.name}.jpg`);
    const oa = await capture(ORIG, p, a, vp, `orig:${vp.key}:${p.name}`);
    const ob = await capture(WP, p, b, vp, `wp:${vp.key}:${p.name}`);
    report.pairs.push({
      viewport: vp.key, viewport_kind: vp.kind, page: p.name, url: p.url,
      mandated_60: MANDATED.has(p.name), origFile: a, wpFile: b, orig: oa, wp: ob,
    });
    console.log(`[${vp.key}] ${p.name.padEnd(30)} status=${oa.status}/${ob.status} img=${oa.imageCount}/${ob.imageCount} broken=${oa.brokenImages.length}/${ob.brokenImages.length} overflow=${oa.overflowX}/${ob.overflowX} hidden=${oa.revealHidden}/${ob.revealHidden} font=${ob.vazirmatnLoaded}`);
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'capture-report.json'), JSON.stringify(report, null, 2));
console.log(`pairs=${report.pairs.length} mandated60=${report.pairs.filter((p) => p.mandated_60).length} consoleErrors=${report.consoleErrors.length} failedRequests=${report.failedRequests.length} httpErrors=${report.httpErrors.length}`);
