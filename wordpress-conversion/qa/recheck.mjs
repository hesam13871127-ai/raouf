/** Re-capture the 5 pairs that showed differences, waiting until every image
 *  is fully decoded and every reveal animation has settled. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ROOT = '/home/user/raouf';
const ORIG = 'http://127.0.0.1:3000';
const WP = 'http://127.0.0.1:9400';
const QA_MODULES = path.join(ROOT, '.work', 'wp-qa', 'node_modules');
const OUT = path.join(ROOT, '.work', 'wp-qa', 'screens');
const require = createRequire(path.join(QA_MODULES, 'noop.js'));
const chromiumModule = await import(pathToFileURL(path.join(QA_MODULES, '@sparticuz/chromium/build/index.js')).href);
const chromium = chromiumModule.default;
const puppeteer = require('puppeteer-core');
await chromiumModule.inflate(path.join(QA_MODULES, '@sparticuz/chromium/bin/al2023.tar.br'));
chromiumModule.setupLambdaEnvironment('/tmp/al2023/lib');
chromium.setGraphicsMode = false;

const CASES = [
  { key: '1920x1080', width: 1920, height: 1080, isMobile: false, name: 'gallery', url: '/gallery/' },
  { key: '1366x768', width: 1366, height: 768, isMobile: false, name: 'home', url: '/' },
  { key: '1920x1080', width: 1920, height: 1080, isMobile: false, name: 'home', url: '/' },
  { key: '768x1024', width: 768, height: 1024, isMobile: true, name: 'course-massage-relaxation', url: '/courses/massage-relaxation/' },
  { key: '768x1024', width: 768, height: 1024, isMobile: true, name: 'course-skin-facial', url: '/courses/skin-facial/' },
];

const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: 'shell' });

async function capture(base, c, file) {
  const page = await browser.newPage();
  await page.setViewport({ width: c.width, height: c.height, deviceScaleFactor: 1, isMobile: c.isMobile, hasTouch: c.isMobile });
  await page.goto(base + c.url, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    for (let pass = 0; pass < 3; pass++) {
      const h = html.scrollHeight;
      for (let y = 0; y < h + 700; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); }
    }
    window.scrollTo(0, 0);
    html.style.scrollBehavior = prev;
  });
  // Force every lazy image to start loading and wait until all decode.
  await page.evaluate(() => {
    document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });
  });
  await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0), { timeout: 60000 });
  await page.waitForFunction(() => Array.from(document.querySelectorAll('.reveal')).every((e) => getComputedStyle(e).opacity === '1'), { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1600));
  const info = await page.evaluate(() => ({
    images: document.images.length,
    broken: Array.from(document.images).filter((i) => !i.complete || i.naturalWidth === 0).length,
    revealsHidden: Array.from(document.querySelectorAll('.reveal')).filter((e) => getComputedStyle(e).opacity !== '1').length,
    overflowX: document.documentElement.scrollWidth - Math.max(window.innerWidth, document.documentElement.clientWidth),
  }));
  await page.addStyleTag({ content: '.mobile-call-bar,.back-to-top{display:none !important}' });
  await page.screenshot({ path: file, type: 'jpeg', quality: 90, fullPage: true });
  await page.close();
  return info;
}

for (const c of CASES) {
  const a = path.join(OUT, `orig-${c.key}-${c.name}.jpg`);
  const b = path.join(OUT, `wp-${c.key}-${c.name}.jpg`);
  const ia = await capture(ORIG, c, a);
  const ib = await capture(WP, c, b);
  console.log(`${c.key} ${c.name.padEnd(30)} orig=${JSON.stringify(ia)} wp=${JSON.stringify(ib)}`);
}
await browser.close();
