/**
 * Real-browser visual comparison: original static site vs WordPress theme.
 * Captures both sites at six viewports and writes JPEGs + a JSON report.
 * QA-only; artifacts live in .work/wp-qa/screens (git-ignored).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ROOT = '/home/user/raouf';
const ORIG = process.env.ORIG_URL || 'http://127.0.0.1:3000';
const WP = process.env.WP_URL || 'http://127.0.0.1:9400';
const QA_MODULES = path.join(ROOT, '.work', 'wp-qa', 'node_modules');
const OUT = path.join(ROOT, '.work', 'wp-qa', 'screens');
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
];

const VIEWPORTS = [
  { key: '1920x1080', width: 1920, height: 1080, isMobile: false },
  { key: '1366x768', width: 1366, height: 768, isMobile: false },
  { key: '1024x768', width: 1024, height: 768, isMobile: false },
  { key: '768x1024', width: 768, height: 1024, isMobile: true },
  { key: '390x844', width: 390, height: 844, isMobile: true },
  { key: '360x800', width: 360, height: 800, isMobile: true },
];

fs.mkdirSync(OUT, { recursive: true });
const report = { generatedAt: new Date().toISOString(), orig: ORIG, wp: WP, pairs: [], consoleErrors: [] };

const executablePath = await chromium.executablePath();
const browser = await puppeteer.launch({ args: chromium.args, executablePath, headless: 'shell' });

function watch(page, label) {
  page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push(`${label}: ${m.text()}`); });
  page.on('pageerror', (e) => report.consoleErrors.push(`${label}: PAGEERROR ${e.message}`));
  page.on('requestfailed', (r) => report.consoleErrors.push(`${label}: REQUEST FAILED ${r.url()} ${r.failure()?.errorText}`));
}

async function capture(base, url, file, viewport, label) {
  const page = await browser.newPage();
  await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1, isMobile: viewport.isMobile, hasTouch: viewport.isMobile });
  watch(page, label);
  const response = await page.goto(base + url, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    const h = html.scrollHeight;
    for (let y = 0; y < h + 700; y += 550) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 55)); }
    window.scrollTo(0, 0);
    html.style.scrollBehavior = prev;
  });
  await new Promise((r) => setTimeout(r, 700));
  const info = await page.evaluate((vp) => ({
    title: document.title,
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    overflowX: document.documentElement.scrollWidth - Math.max(vp.width, window.innerWidth),
    brokenImages: Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
    imageCount: document.images.length,
    revealHidden: Array.from(document.querySelectorAll('.reveal')).filter((e) => getComputedStyle(e).opacity === '0').length,
    fontFamily: getComputedStyle(document.body).fontFamily,
  }), viewport);
  await page.addStyleTag({ content: '.mobile-call-bar,.back-to-top{display:none !important}' });
  await page.screenshot({ path: file, type: 'jpeg', quality: 90, fullPage: true });
  await page.close();
  return { status: response.status(), ...info };
}

for (const vp of VIEWPORTS) {
  for (const p of PAGES) {
    const a = path.join(OUT, `orig-${vp.key}-${p.name}.jpg`);
    const b = path.join(OUT, `wp-${vp.key}-${p.name}.jpg`);
    const oa = await capture(ORIG, p.url, a, vp, `orig:${vp.key}:${p.name}`);
    const ob = await capture(WP, p.url, b, vp, `wp:${vp.key}:${p.name}`);
    report.pairs.push({ viewport: vp.key, page: p.name, url: p.url, orig: oa, wp: ob, origFile: a, wpFile: b });
    console.log(`[${vp.key}] ${p.name.padEnd(30)} orig=${oa.status}/${oa.brokenImages.length}img wp=${ob.status}/${ob.brokenImages.length}img overflow=${oa.overflowX}/${ob.overflowX} hidden=${oa.revealHidden}/${ob.revealHidden}`);
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'capture-report.json'), JSON.stringify(report, null, 2));
console.log('console errors:', report.consoleErrors.length);
