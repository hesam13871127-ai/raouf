'use strict';

/**
 * Raouf Academy — zero-dependency static server + real form backend.
 *
 * - Serves the generated static site with clean (SEO friendly) directory URLs.
 * - Persists registration / contact submissions to append-only JSONL files.
 * - Validates input server-side, protects with a double-submit CSRF cookie,
 *   a honeypot field, rate limiting and duplicate-submission detection.
 * - Optional administrator delivery: set ADMIN_WEBHOOK_URL to forward each
 *   submission, and ADMIN_TOKEN to read them back via /api/admin/submissions.
 *
 * Nothing is faked: a success response is only sent after the record was
 * written to disk (and, when configured, after the webhook was attempted).
 */

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { URL } = require('node:url');

const ROOT = path.join(__dirname, 'public');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data');
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const ADMIN_WEBHOOK_URL = process.env.ADMIN_WEBHOOK_URL || '';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.xml', '.txt', '.svg']);

/* Route list written by scripts/build.js; used for host-correct sitemap.xml. */
let ROUTES = ['/'];
try { ROUTES = JSON.parse(fs.readFileSync(path.join(ROOT, 'routes.json'), 'utf8')); }
catch (_) { /* fall back to the single root route */ }

/* ----------------------------------------------------------- validation */
const COURSE_IDS = new Set([
  'skin-facial',
  'medical-emergency',
  'pharmacy-technician',
  'massage-relaxation',
]);

function toEnglishDigits(value) {
  return String(value)
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}
function normalizePhone(value) {
  let p = toEnglishDigits(value).replace(/[\s\u200C\u200F\-().]/g, '');
  if (p.startsWith('00989')) p = '0' + p.slice(4);
  else if (p.startsWith('+989')) p = '0' + p.slice(3);
  else if (p.startsWith('989')) p = '0' + p.slice(2);
  return p;
}
const validPhone = (v) => /^09\d{9}$/.test(normalizePhone(v));
const validName = (v) =>
  v.length >= 2 && v.length <= 80 &&
  /^[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFC\u200C\u0020A-Za-z\u00C0-\u024F'\-.]{2,80}$/.test(v);

function validate(payload, kind) {
  const errors = {};
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const name = str(payload.name);
  const phone = str(payload.phone);
  const message = str(payload.message);

  if (!validName(name)) errors.name = 'نام و نام خانوادگی معتبر نیست.';
  if (!validPhone(phone)) errors.phone = 'شماره تماس معتبر نیست.';
  if (message.length > 1200) errors.message = 'متن پیام بیش از حد طولانی است.';

  const out = { name, phone: normalizePhone(phone), message };
  if (kind === 'registration') {
    const course = str(payload.course);
    if (!COURSE_IDS.has(course)) errors.course = 'دوره انتخاب\u200Cشده معتبر نیست.';
    out.course = course;
  } else {
    const email = str(payload.email);
    const subject = str(payload.subject);
    if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120)) errors.email = 'رایانامه معتبر نیست.';
    if (subject.length < 2 || subject.length > 120) errors.subject = 'موضوع پیام معتبر نیست.';
    if (message.length < 10) errors.message = 'متن پیام باید حداقل ۱۰ نویسه باشد.';
    out.email = email;
    out.subject = subject;
  }
  return { errors, data: out };
}

/* --------------------------------------------------------- abuse controls */
const rateHits = new Map();      // ip -> [timestamps]
const duplicateIndex = new Map(); // key -> timestamp
const RATE_LIMIT = 8;
const RATE_WINDOW = 15 * 60 * 1000;
const DUPLICATE_WINDOW = 10 * 60 * 1000;

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}
function ipHash(ip) {
  return crypto.createHash('sha256').update('raouf|' + ip).digest('hex').slice(0, 16);
}
function rateLimited(ip) {
  const now = Date.now();
  const hits = (rateHits.get(ip) || []).filter((t) => now - t < RATE_WINDOW);
  hits.push(now);
  rateHits.set(ip, hits);
  return hits.length > RATE_LIMIT;
}
function isDuplicate(key) {
  const now = Date.now();
  const last = duplicateIndex.get(key);
  if (last && now - last < DUPLICATE_WINDOW) return true;
  duplicateIndex.set(key, now);
  return false;
}
function removeDuplicate(key) { duplicateIndex.delete(key); }

/* Load recent submissions so duplicate protection also survives a restart. */
async function loadRecentRecords() {
  for (const [file, kind] of [['registrations.jsonl', 'registration'], ['contacts.jsonl', 'contact']]) {
    const p = path.join(DATA_DIR, file);
    try {
      const text = await fsp.readFile(p, 'utf8');
      for (const line of text.split('\n').slice(-200)) {
        if (!line.trim()) continue;
        try {
          const rec = JSON.parse(line);
          if (!rec.createdAt) continue;
          const key = rec.dedupeKey || `${kind}:${rec.phone}:${rec.course || rec.subject || ''}`;
          const t = new Date(rec.createdAt).getTime();
          if (Number.isFinite(t)) duplicateIndex.set(key, t);
        } catch (_) { /* ignore malformed lines */ }
      }
    } catch (e) {
      if (e.code !== 'ENOENT') console.warn('Could not read', p, e.message);
    }
  }
}

/* -------------------------------------------------------------- responses */
function sendJson(res, status, body, req) {
  const payload = JSON.stringify(body);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };
  if (req && req.csrfCookieToSet) headers['Set-Cookie'] = req.csrfCookieToSet;
  res.writeHead(status, headers);
  res.end(req && req.method === 'HEAD' ? undefined : payload);
}

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    try { out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } catch (_) {}
  }
  return out;
}
function csrfCookieFor(req) {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.raouf_csrf && /^[a-f0-9]{32,64}$/.test(cookies.raouf_csrf)) return null;
  const token = crypto.randomBytes(24).toString('hex');
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  return `raouf_csrf=${token}; Path=/; SameSite=Strict; Max-Age=86400${secure}`;
}

async function readBody(req, limit = 16384) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('payload too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch (_) { reject(Object.assign(new Error('invalid JSON'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function makeId(kind) {
  const d = new Date();
  const date = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  return `${kind === 'registration' ? 'REG' : 'MSG'}-${date}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

async function persist(file, record) {
  await fsp.mkdir(DATA_DIR, { recursive: true, mode: 0o700 });
  await fsp.appendFile(path.join(DATA_DIR, file), JSON.stringify(record) + '\n', { mode: 0o600, encoding: 'utf8' });
}

async function notifyAdmin(record) {
  if (!ADMIN_WEBHOOK_URL) return { attempted: false, delivered: false };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(ADMIN_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'raouf.submission', record }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return { attempted: true, delivered: res.ok };
  } catch (e) {
    return { attempted: true, delivered: false, error: e.message };
  }
}

async function handleSubmission(req, res, kind) {
  if (rateLimited(clientIp(req))) {
    return sendJson(res, 429, { ok: false, message: 'تعداد درخواست\u200Cها بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.' });
  }
  let payload;
  try { payload = await readBody(req); }
  catch (e) { return sendJson(res, e.status || 400, { ok: false, message: 'درخواست نامعتبر است.' }); }

  if (typeof payload.website === 'string' && payload.website.trim() !== '') {
    return sendJson(res, 400, { ok: false, message: 'درخواست نامعتبر است.' });
  }

  const { errors, data } = validate(payload, kind);
  if (Object.keys(errors).length) {
    return sendJson(res, 400, { ok: false, message: 'اطلاعات واردشده معتبر نیست.', errors });
  }

  const dedupeKey = `${kind}:${data.phone}:${data.course || data.subject}`;
  if (isDuplicate(dedupeKey)) {
    return sendJson(res, 409, { ok: false, message: 'این درخواست همین حالا ثبت شده است. لطفاً از ارسال مجدد خودداری کنید.' });
  }

  const record = {
    id: makeId(kind),
    kind,
    createdAt: new Date().toISOString(),
    ...data,
    dedupeKey,
    ipHash: ipHash(clientIp(req)),
  };

  try {
    await persist(kind === 'registration' ? 'registrations.jsonl' : 'contacts.jsonl', record);
  } catch (e) {
    removeDuplicate(dedupeKey);
    console.error('Failed to persist submission:', e);
    return sendJson(res, 500, { ok: false, message: 'ذخیره\u200Cسازی اطلاعات انجام نشد. لطفاً دوباره تلاش کنید یا با آموزشگاه تماس بگیرید.' });
  }

  const notify = await notifyAdmin(record);
  console.log(`[submission] ${record.id} ${record.kind} stored${notify.attempted ? (notify.delivered ? ' + webhook delivered' : ' + webhook failed') : ''}`);
  return sendJson(res, 201, {
    ok: true,
    id: record.id,
    message: 'اطلاعات با موفقیت ثبت شد.',
    adminDelivery: notify.attempted ? (notify.delivered ? 'sent' : 'failed') : 'not-configured',
  });
}

/* ------------------------------------------------------------ static files */
function safePath(pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch (_) { return null; }
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(ROOT, normalized);
  if (!full.startsWith(ROOT + path.sep) && full !== ROOT) return null;
  return full;
}
function resolveTarget(pathname) {
  const clean = pathname.split('?')[0];
  let target = safePath(clean);
  if (!target) return null;
  if (!path.extname(target)) {
    if (clean.endsWith('/')) target = path.join(target, 'index.html');
    else {
      const asDir = path.join(target, 'index.html');
      if (fs.existsSync(asDir)) target = asDir;
      else target += '.html';
    }
  }
  return target;
}

async function serveStatic(req, res, pathname) {
  let target = resolveTarget(pathname);
  if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    const fallback = path.join(ROOT, '404', 'index.html');
    if (fs.existsSync(fallback)) { target = fallback; res.statusCode = 404; }
    else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('صفحه پیدا نشد');
    }
  }
  const ext = path.extname(target).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const isHtml = ext === '.html';
  const setCookie = isHtml ? csrfCookieFor(req) : null;

  let body = await fsp.readFile(target);
  const headers = {
    'Content-Type': type,
    'Cache-Control': isHtml ? 'no-cache' : 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
  if (setCookie) headers['Set-Cookie'] = setCookie;
  const accept = String(req.headers['accept-encoding'] || '');
  if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(accept) && body.length > 1024) {
    body = zlib.gzipSync(body, { level: 6 });
    headers['Content-Encoding'] = 'gzip';
    headers['Vary'] = 'Accept-Encoding';
  }
  headers['Content-Length'] = body.length;
  const status = res.statusCode && res.statusCode >= 400 ? res.statusCode : 200;
  res.writeHead(status, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
}

/* ------------------------------------------------------------------ server */
const server = http.createServer(async (req, res) => {
  let url;
  try { url = new URL(req.url, `http://${req.headers.host || 'localhost'}`); }
  catch (_) { return sendJson(res, 400, { ok: false, message: 'bad request' }); }
  const pathname = url.pathname;

  try {
    if (req.method === 'GET' && pathname === '/api/health') {
      return sendJson(res, 200, { ok: true, service: 'raouf-academy', time: new Date().toISOString() });
    }

    if (req.method === 'GET' && pathname === '/api/admin/submissions') {
      if (!ADMIN_TOKEN) return sendJson(res, 403, { ok: false, message: 'دسترسی ادمین پیکربندی نشده است.' });
      const provided = req.headers['x-admin-token'] || url.searchParams.get('token') || '';
      if (provided !== ADMIN_TOKEN) return sendJson(res, 403, { ok: false, message: 'توکن ادمین نامعتبر است.' });
      const read = async (f) => {
        try { return (await fsp.readFile(path.join(DATA_DIR, f), 'utf8')).trim().split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (_) { return null; } }).filter(Boolean); }
        catch (e) { return []; }
      };
      return sendJson(res, 200, { ok: true, registrations: await read('registrations.jsonl'), contacts: await read('contacts.jsonl') });
    }

    if ((pathname === '/api/registrations' || pathname === '/api/contact') && req.method === 'POST') {
      /* Double-submit CSRF check: cookie must exist and match the header. */
      const cookies = parseCookies(req.headers.cookie);
      const token = cookies.raouf_csrf;
      const header = String(req.headers['x-csrf-token'] || '');
      if (!token || !header || token !== header) {
        return sendJson(res, 403, { ok: false, message: 'نشست فرم معتبر نیست. لطفاً صفحه را بازنشانی کنید.' });
      }
      return await handleSubmission(req, res, pathname === '/api/registrations' ? 'registration' : 'contact');
    }

    if (pathname.startsWith('/api/')) return sendJson(res, 404, { ok: false, message: 'endpoint not found' });

    /* Serve sitemap/robots with the real deployment origin instead of the
       build-time placeholder, so absolute URLs are always correct. */
    if ((pathname === '/sitemap.xml' || pathname === '/robots.txt') && (req.method === 'GET' || req.method === 'HEAD')) {
      const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0];
      const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000').split(',')[0];
      const origin = `${proto}://${host}`;
      const isSitemap = pathname === '/sitemap.xml';
      const body = isSitemap
        ? `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${ROUTES
            .map((r) => `  <url><loc>${origin}${r}</loc><changefreq>monthly</changefreq><priority>${r === '/' ? '1.0' : '0.8'}</priority></url>`)
            .join('\n')}\n</urlset>\n`
        : `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`;
      const buf = Buffer.from(body, 'utf8');
      res.writeHead(200, {
        'Content-Type': isSitemap ? 'application/xml; charset=utf-8' : 'text/plain; charset=utf-8',
        'Content-Length': buf.length,
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      });
      return res.end(req.method === 'HEAD' ? undefined : buf);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { ok: false, message: 'method not allowed' });

    /* Redirect /page to /page/ for canonical clean URLs (except /). */
    if (!pathname.endsWith('/') && !path.extname(pathname)) {
      const asDir = path.join(safePath(pathname) || '', 'index.html');
      if (fs.existsSync(asDir)) {
        res.writeHead(308, { Location: pathname + '/' + (url.search || ''), 'Cache-Control': 'no-cache' });
        return res.end();
      }
    }
    return await serveStatic(req, res, pathname);
  } catch (e) {
    console.error('Request failed:', e);
    if (!res.headersSent) return sendJson(res, 500, { ok: false, message: 'خطای داخلی سرور' });
    res.end();
  }
});

loadRecentRecords().finally(() => {
  server.listen(PORT, HOST, () => {
    console.log(`Raouf Academy listening on http://${HOST}:${PORT}`);
  });
});

module.exports = { server, validate, normalizePhone, validPhone, validName };
