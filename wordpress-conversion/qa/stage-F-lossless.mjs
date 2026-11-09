/**
 * Lossless PNG re-capture of ONLY the JPEG pairs with AE>0 (JPEG encoder
 * noise is indistinguishable from a real diff at quality 90 without this).
 * Reads .work/wp-qa/stage-f-screens/visual-diff.json, writes
 * stage-f-screens/lossless/*.png and stage-f-screens/lossless-index.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ROOT = '/home/user/raouf';
const ORIG = process.env.ORIG_URL || 'http://127.0.0.1:3000';
const WP = process.env.WP_URL || 'http://127.0.0.1:9411';
const SCREEN = process.env.SHOT_DIR || path.join(ROOT, '.work', 'wp-qa', 'stage-f-screens');
const DIFF = path.join(SCREEN, 'visual-diff.json');
const PNG_DIR = path.join(SCREEN, 'lossless');
const QA_MODULES = path.join(ROOT, '.work', 'wp-qa', 'node_modules');
const require = createRequire(path.join(QA_MODULES, 'noop.js'));
const chromiumModule = await import(pathToFileURL(path.join(QA_MODULES, '@sparticuz/chromium/build/index.js')).href);
const chromium = chromiumModule.default;
const puppeteer = require('puppeteer-core');
await chromiumModule.inflate(path.join(QA_MODULES, '@sparticuz/chromium/bin/al2023.tar.br'));
chromiumModule.setupLambdaEnvironment('/tmp/al2023/lib');
chromium.setGraphicsMode = false;

const diffs = JSON.parse(fs.readFileSync(DIFF, 'utf8'));
fs.mkdirSync(PNG_DIR, { recursive: true });
const capture = JSON.parse(fs.readFileSync(path.join(SCREEN, 'capture-report.json'), 'utf8'));
const vps = Object.fromEntries(capture.viewports.map((v) => [v.key, v]));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: 'shell' });
const out = [];

async function shoot(base, url, vp, file) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: vp.isMobile, hasTouch: vp.isMobile });
  await page.goto(base + url, { waitUntil: 'networkidle2', timeout: 120000 });
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const root = document.documentElement;
    root.style.scrollBehavior = 'auto';
    for (let pass = 0; pass < 3; pass++) {
      const h = root.scrollHeight;
      for (let y = 0; y < h + 700; y += 450) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    }
    window.scrollTo(0, 0);
    document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });
  });
  await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0), { timeout: 60000 });
  await page.waitForFunction(() => Array.from(document.querySelectorAll('.reveal')).every((e) => getComputedStyle(e).opacity === '1'), { timeout: 30000 });
  await wait(900);
  await page.addStyleTag({ content: '.mobile-call-bar,.back-to-top{display:none !important}' });
  await page.screenshot({ path: file, type: 'png', fullPage: true });
  await page.close();
}

for (const d of diffs) {
  const vp = vps[d.viewport];
  const a = path.join(PNG_DIR, `orig-${d.viewport}-${d.page}.png`);
  const b = path.join(PNG_DIR, `wp-${d.viewport}-${d.page}.png`);
  await shoot(ORIG, d.url, vp, a);
  await shoot(WP, d.url, vp, b);
  out.push({ viewport: d.viewport, page: d.page, url: d.url, orig: a, wp: b, strict_AE: d.AE, fuzz_AE: d.fuzz_AE });
  console.log('lossless recapture', d.viewport, d.page);
}
await browser.close();
fs.writeFileSync(path.join(SCREEN, 'lossless-index.json'), JSON.stringify(out, null, 2));
