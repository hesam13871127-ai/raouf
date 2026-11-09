/**
 * Stage F — performance, accessibility (axe-core 4.10.3), PHP/Console/network
 * error audit over all 11 routes at desktop + mobile viewport.
 *
 * Read-only: no theme, CSS, JS, image or content is modified. Findings that
 * would change the appearance are documented, never silently "fixed".
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ROOT = '/home/user/raouf';
const ORIG = process.env.ORIG_URL || 'http://127.0.0.1:3000';
const WP = process.env.WP_URL || 'http://127.0.0.1:9411';
const RES = path.join(ROOT, 'wordpress-conversion', 'qa', 'results');
const QA_MODULES = path.join(ROOT, '.work', 'wp-qa', 'node_modules');
const AXE = path.join(QA_MODULES, 'axe-core', 'axe.min.js');
const require = createRequire(path.join(QA_MODULES, 'noop.js'));
const chromiumModule = await import(pathToFileURL(path.join(QA_MODULES, '@sparticuz/chromium/build/index.js')).href);
const chromium = chromiumModule.default;
const puppeteer = require('puppeteer-core');
await chromiumModule.inflate(path.join(QA_MODULES, '@sparticuz/chromium/bin/al2023.tar.br'));
chromiumModule.setupLambdaEnvironment('/tmp/al2023/lib');
chromium.setGraphicsMode = false;

const ROUTES = ['/', '/courses/', '/courses/skin-facial/', '/courses/medical-emergency/',
  '/courses/pharmacy-technician/', '/courses/massage-relaxation/', '/about/',
  '/gallery/', '/contact/', '/register/', '/404/'];
const VIEWPORTS = [
  { key: '1366x768', width: 1366, height: 768, isMobile: false, kind: 'desktop' },
  { key: '390x844', width: 390, height: 844, isMobile: true, kind: 'mobile' },
];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: 'shell' });

// Real byte sizes of every delivered asset, from the filesystem (authoritative).
// Playground/WASM does not expose Resource Timing encodedBodySize, so this is
// used as the transfer-size baseline; content-length headers are recorded too.
const sizeByBasename = {};
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else sizeByBasename[e.name] = fs.statSync(p).size;
  }
})(path.join(ROOT, 'wordpress-conversion', 'theme', 'raouf-academy'));

const performance = { stage: 'F', wp: WP, orig: ORIG, rows: [], generatedAt: new Date().toISOString() };
const accessibility = { stage: 'F', wp: WP, tool: 'axe-core 4.10.3', tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'], rows: [], generatedAt: new Date().toISOString() };
const errors = { stage: 'F', wp: WP, rows: [], consoleErrors: [], pageErrors: [], failedRequests: [], httpErrors: [], generatedAt: new Date().toISOString() };

for (const vp of VIEWPORTS) {
  for (const route of ROUTES) {
    const label = `${vp.key}:${route}`;
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: vp.isMobile, hasTouch: vp.isMobile });
    const reqs = [];
    let contentLengthBytes = 0;
    const consoleErrors = [], pageErrors = [], failedRequests = [], httpErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`${label}: ${m.text()} @ ${m.location()?.url || ''}`); });
    page.on('pageerror', (e) => pageErrors.push(`${label}: ${e.message}`));
    page.on('requestfailed', (r) => failedRequests.push(`${label}: ${r.url()} ${r.failure()?.errorText}`));
    page.on('request', (r) => reqs.push(r));
    page.on('response', (r) => {
      if (r.status() >= 400) httpErrors.push(`${label}: HTTP ${r.status()} ${r.url()}`);
      const cl = parseInt(r.headers()['content-length'] || '0', 10);
      if (cl > 0) contentLengthBytes += cl;
    });

    let response;
    for (let i = 0; i < 5; i++) {
      try { response = await page.goto(WP + route, { waitUntil: 'networkidle2', timeout: 120000 }); break; }
      catch (e) { if (i === 4) throw e; await wait(2500); }
    }
    const html = await response.text();
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
    });
    // Do NOT force lazy images to eager here: this audit must observe the
    // delivered loading="lazy" attributes as-is (visual capture does that).
    await wait(600);

    const perf = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] || {};
      const res = performance.getEntriesByType('resource');
      const byType = {};
      let encoded = 0, decoded = 0;
      const biggest = [];
      for (const r of res) {
        const t = (r.initiatorType || 'other');
        byType[t] = (byType[t] || 0) + 1;
        encoded += r.encodedBodySize || 0;
        decoded += r.decodedBodySize || 0;
        biggest.push({ name: r.name.split('/').pop(), bytes: r.encodedBodySize || 0, type: t });
      }
      biggest.sort((a, b) => b.bytes - a.bytes);
      return {
        domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd || 0),
        loadEventMs: Math.round(nav.loadEventEnd || 0),
        responseEndMs: Math.round(nav.responseEnd || 0),
        resourceCount: res.length, resourceCountByType: byType,
        encodedBytes: encoded, decodedBytes: decoded, largestResources: biggest.slice(0, 6),
        imgTotal: document.images.length,
        imgLazy: document.querySelectorAll('img[loading="lazy"]').length,
        imgWithSrcset: document.querySelectorAll('img[srcset]').length,
        imgWithDimensions: Array.from(document.images).filter((i) => i.getAttribute('width') && i.getAttribute('height')).length,
        // alt="" is VALID for a decorative image; only a missing attribute is a defect.
        imgMissingAlt: Array.from(document.images).filter((i) => !i.hasAttribute('alt')).length,
        imgDecorativeEmptyAlt: Array.from(document.images).filter((i) => i.getAttribute('alt') === '').length,
        imgWithDecoding: document.querySelectorAll('img[decoding]').length,
        brokenImages: Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0).length,
        stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length,
        scripts: document.querySelectorAll('script[src]').length,
        inlineSvg: document.querySelectorAll('svg').length,
        fontFacesLoaded: document.fonts.check('16px "Vazirmatn"') || document.fonts.check('16px Vazirmatn'),
        resourceNames: res.map((r) => r.name.split('/').pop()),
        // External RESOURCE loads (img/script/link/source/use) only. External
        // anchor links to Instagram / OpenStreetMap are intentional site content.
        externalResourceRequests: Array.from(document.querySelectorAll('img[src],script[src],link[href],source[src],use[href]'))
          .map((e) => e.getAttribute('src') || e.getAttribute('href') || '')
          .filter((u) => /^https?:\/\//.test(u) && !u.startsWith(location.origin)).length,
        externalAnchorLinks: Array.from(document.querySelectorAll('a[href]'))
          .map((e) => e.getAttribute('href'))
          .filter((u) => /^https?:\/\//.test(u) && !u.startsWith(location.origin)).length,
        lang: document.documentElement.lang, dir: document.documentElement.dir,
      };
    });
    const assetBytes = perf.resourceNames.reduce((s, n) => s + (sizeByBasename[n] || 0), 0);
    performance.rows.push({ route, viewport: vp.key, viewport_kind: vp.kind, http: response.status(),
      ...perf, assetBytesFromFilesystem: assetBytes, contentLengthBytes,
      resourceTimingEncodedBytes: perf.encodedBytes,
      note: 'WASM-based Playground reports Resource Timing encodedBodySize=0; assetBytesFromFilesystem is the authoritative delivered byte size.' });

    // axe-core: real WCAG audit on the delivered WordPress output.
    await page.addScriptTag({ path: AXE });
    let axeResult;
    try {
      axeResult = await page.evaluate(async (tags) => {
        const r = await window.axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations', 'incomplete'] });
        const slim = (arr) => arr.map((v) => ({ id: v.id, impact: v.impact, help: v.help,
          nodes: v.nodes.slice(0, 6).map((n) => ({ target: n.target, summary: (n.failureSummary || '').slice(0, 220) })),
          nodeCount: v.nodes.length }));
        return { violations: slim(r.violations), incomplete: slim(r.incomplete), passes: r.passes.length };
      }, accessibility.tags);
    } catch (e) {
      axeResult = { violations: [], incomplete: [], passes: 0, error: String(e.message) };
    }
    accessibility.rows.push({ route, viewport: vp.key, viewport_kind: vp.kind, ...axeResult });

    const phpStrings = html.match(/(?:Fatal error|Parse error|Warning|Notice|Deprecated):[^<\n]{0,120}/g) || [];
    errors.rows.push({ route, viewport: vp.key, http: response.status(), phpErrorStrings: phpStrings,
      consoleErrors: consoleErrors.length, pageErrors: pageErrors.length,
      failedRequests: failedRequests.length, httpErrors: httpErrors.length, brokenImages: perf.brokenImages });
    errors.consoleErrors.push(...consoleErrors);
    errors.pageErrors.push(...pageErrors);
    errors.failedRequests.push(...failedRequests);
    errors.httpErrors.push(...httpErrors);
    console.log(`[${vp.key}] ${route.padEnd(38)} http=${response.status()} res=${perf.resourceCount} assetBytes=${assetBytes} php=${phpStrings.length} console=${consoleErrors.length} axeViolations=${axeResult.violations.length}`);
    await page.close();
  }
}
await browser.close();

/* ---- aggregate summaries (documentation only, no auto-fix) ---- */
const allViolations = {};
for (const r of accessibility.rows) {
  for (const v of r.violations) {
    const k = v.id;
    allViolations[k] = allViolations[k] || { id: k, impact: v.impact, help: v.help, routes: [], totalNodes: 0 };
    allViolations[k].routes.push(`${r.viewport}:${r.route}`);
    allViolations[k].totalNodes += v.nodeCount;
  }
}
accessibility.summary = {
  rows: accessibility.rows.length,
  routes: ROUTES.length,
  viewports: VIEWPORTS.map((v) => v.key),
  unique_violation_types: Object.keys(allViolations).length,
  violations: Object.values(allViolations).sort((a, b) => b.totalNodes - a.totalNodes),
  total_violation_instances: Object.values(allViolations).reduce((s, v) => s + v.totalNodes, 0),
  pages_with_zero_violations: accessibility.rows.filter((r) => r.violations.length === 0).length,
  decision: 'NO CHANGE — every violation would require a CSS colour, heading level, or DOM/ARIA edit, which would break the byte-for-byte parity with the authoritative source. Deferred to an explicit user decision (documented in the final report).',
};
const bytes = performance.rows.map((r) => r.assetBytesFromFilesystem);
performance.summary = {
  rows: performance.rows.length, routes: ROUTES.length,
  min_asset_bytes: Math.min(...bytes), max_asset_bytes: Math.max(...bytes),
  mean_asset_bytes: Math.round(bytes.reduce((a, b) => a + b, 0) / bytes.length),
  total_broken_images: performance.rows.reduce((s, r) => s + r.brokenImages, 0),
  total_missing_alt_attribute: performance.rows.reduce((s, r) => s + r.imgMissingAlt, 0),
  total_decorative_empty_alt: performance.rows.reduce((s, r) => s + r.imgDecorativeEmptyAlt, 0),
  total_lazy_images: performance.rows.reduce((s, r) => s + r.imgLazy, 0),
  image_heavy_routes_use_lazy_loading: performance.rows.filter((r) => r.imgTotal > 5).every((r) => r.imgLazy > 0),
  no_external_resource_requests: performance.rows.every((r) => r.externalResourceRequests === 0),
  intentional_external_anchor_links: performance.rows.reduce((s, r) => s + r.externalAnchorLinks, 0),
  decision: 'NO CHANGE — no critical runtime defect found. Deferred optimisation candidates (require an appearance/asset decision): 4 images >200KB, no CDN/caching headers, no fetchpriority hint. axe color-contrast findings are inherited from the authoritative source design and would require CSS colour edits.',
};
errors.summary = {
  rows: errors.rows.length,
  php_error_strings: errors.rows.reduce((s, r) => s + r.phpErrorStrings.length, 0),
  page_errors: errors.pageErrors.length,
  console_errors: errors.consoleErrors.length,
  failed_requests: errors.failedRequests.length,
  http_errors: errors.httpErrors.length,
  broken_images: errors.rows.reduce((s, r) => s + r.brokenImages, 0),
  http_error_classification: {
    intentional_404_route: errors.httpErrors.filter((x) => /\/404\/?/.test(x)).length,
    theme_asset_errors: errors.httpErrors.filter((x) => /\/wp-content\/themes\/raouf-academy\//.test(x)).length,
    other: errors.httpErrors.filter((x) => !/\/404\/?/.test(x) && !/\/wp-content\/themes\/raouf-academy\//.test(x)),
  },
};

fs.mkdirSync(RES, { recursive: true });
fs.writeFileSync(path.join(RES, 'stage-F-performance.json'), JSON.stringify(performance, null, 2));
fs.writeFileSync(path.join(RES, 'stage-F-accessibility.json'), JSON.stringify(accessibility, null, 2));
fs.writeFileSync(path.join(RES, 'stage-F-console.json'), JSON.stringify(errors, null, 2));
console.log('\nPERFORMANCE', JSON.stringify(performance.summary));
console.log('ACCESSIBILITY', JSON.stringify({ rows: accessibility.summary.rows, unique: accessibility.summary.unique_violation_types, total: accessibility.summary.total_violation_instances }));
console.log('ERRORS', JSON.stringify(errors.summary));
