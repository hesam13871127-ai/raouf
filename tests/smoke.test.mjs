import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4399;
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(ROOT, '.work', 'test-data-'));
const child = spawn(process.execPath, ['server.js'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT), DATA_DIR, ADMIN_TOKEN: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
child.stdout.on('data', (d) => (serverLog += d.toString()));
child.stderr.on('data', (d) => (serverLog += d.toString()));

after(() => {
  child.kill('SIGTERM');
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
});

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(BASE + '/api/health');
      if (r.ok) return;
    } catch (_) { /* not ready yet */ }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('server did not start:\n' + serverLog);
}
await waitForServer();

function cookieFrom(res) {
  const raw = res.headers.get('set-cookie') || '';
  return raw.split(';')[0];
}
let csrfCookie = '';

async function post(kind, payload, extraHeaders = {}) {
  const r = await fetch(BASE + (kind === 'registration' ? '/api/registrations' : '/api/contact'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': csrfCookie,
      'X-CSRF-Token': csrfCookie.replace('raouf_csrf=', ''),
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
  });
  return { status: r.status, body: await r.json() };
}

const ROUTES = [
  '/', '/courses/', '/courses/skin-facial/', '/courses/medical-emergency/',
  '/courses/pharmacy-technician/', '/courses/massage-relaxation/',
  '/about/', '/gallery/', '/contact/', '/register/',
];

test('every page returns 200 with correct RTL semantics and unique SEO metadata', async () => {
  const titles = new Set();
  for (const route of ROUTES) {
    const r = await fetch(BASE + route);
    assert.equal(r.status, 200, `${route} status`);
    const html = await r.text();
    assert.match(html, /<html lang="fa" dir="rtl">/, `${route} RTL`);
    assert.match(html, /<meta name="description" content=".+"/, `${route} description`);
    assert.match(html, /<link rel="canonical" href="\/[^"]*"/, `${route} canonical`);
    const title = html.match(/<title>([^<]+)<\/title>/)[1];
    assert.ok(title.length > 10, `${route} title`);
    assert.ok(!titles.has(title), `duplicate title on ${route}`);
    titles.add(title);
    assert.match(html, /href="tel:\+989141803287"/, `${route} clickable phone`);
    assert.match(html, /https:\/\/www\.instagram\.com\/academi_raouf\//, `${route} Instagram`);
    assert.match(html, /<footer class="site-footer">/, `${route} footer`);
    assert.doesNotMatch(html, /href="#"/, `${route} no empty anchors`);
    assert.doesNotMatch(html, /Lorem|لورم/, `${route} no placeholder copy`);
  }
  if (!csrfCookie) csrfCookie = cookieFrom(await fetch(BASE + '/'));
  assert.match(csrfCookie, /^raouf_csrf=[a-f0-9]{48}$/, 'CSRF cookie issued on HTML responses');
});

test('header navigation, dropdown links and footer links all resolve', async () => {
  const html = await (await fetch(BASE + '/')).text();
  const links = [...html.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]);
  const internal = [...new Set(links.filter((l) => !l.startsWith('/assets/')))];
  for (const link of internal) {
    const r = await fetch(BASE + link, { redirect: 'follow' });
    assert.equal(r.status, 200, `broken internal link ${link}`);
  }
  for (const id of ['skin-facial', 'medical-emergency', 'pharmacy-technician', 'massage-relaxation']) {
    assert.ok(internal.includes(`/courses/${id}/`), `course ${id} linked in header/footer`);
  }
});

test('clean URLs, 404 handling and sitemap/robots', async () => {
  const redirect = await fetch(BASE + '/about', { redirect: 'manual' });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get('location'), '/about/');
  const missing = await fetch(BASE + '/this-page-does-not-exist/');
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /۴۰۴/);
  const robots = await fetch(BASE + '/robots.txt');
  assert.equal(robots.status, 200);
  assert.match(await robots.text(), /Allow: \//);
  const sitemap = await fetch(BASE + '/sitemap.xml');
  assert.equal(sitemap.status, 200);
  const xml = await sitemap.text();
  assert.ok((xml.match(/<loc>/g) || []).length >= 10);
});

test('static assets are served with the right MIME types', async () => {
  const cases = [
    ['/assets/css/style.css', 'text/css'],
    ['/assets/js/app.js', 'application/javascript'],
    ['/assets/fonts/vazirmatn-arabic-wght-normal.woff2', 'font/woff2'],
    ['/assets/images/raouf-logo.jpg', 'image/jpeg'],
    ['/assets/images/hero-academy.webp', 'image/webp'],
  ];
  for (const [url, mime] of cases) {
    const r = await fetch(BASE + url);
    assert.equal(r.status, 200, url);
    assert.ok(r.headers.get('content-type').startsWith(mime), `${url} content-type`);
  }
});

test('registration API validates, stores, returns a real id and blocks duplicates', async () => {
  const invalid = await post('registration', { name: 'a', phone: '123', course: 'not-a-course', message: '' });
  assert.equal(invalid.status, 400);
  assert.deepEqual(Object.keys(invalid.body.errors).sort(), ['course', 'name', 'phone']);

  const payload = {
    name: 'تست کیفیت',
    phone: '۰۹۱۴۱۲۳۴۵۶۷', // Persian digits must normalise
    course: 'skin-facial',
    message: 'درخواست آزمایشی',
  };
  const ok = await post('registration', payload);
  assert.equal(ok.status, 201);
  assert.equal(ok.body.ok, true);
  assert.match(ok.body.id, /^REG-\d{8}-[A-F0-9]{6}$/);
  const stored = fs.readFileSync(path.join(DATA_DIR, 'registrations.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(stored.length, 1);
  assert.equal(stored[0].phone, '09141234567');
  assert.equal(stored[0].course, 'skin-facial');
  assert.equal(stored[0].id, ok.body.id);
  assert.ok(!('rawIp' in stored[0]));

  const dup = await post('registration', payload);
  assert.equal(dup.status, 409, 'accidental duplicate submission blocked');
});

test('CSRF, honeypot, contact validation and admin protection', async () => {
  const noCsrf = await fetch(BASE + '/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'تست کیفیت', phone: '09140000001', subject: 'موضوع', message: 'یک پیام آزمایشی معتبر' }),
  });
  assert.equal(noCsrf.status, 403);

  const spam = await post('contact', {
    name: 'تست کیفیت', phone: '09140000002', subject: 'موضوع', message: 'یک پیام آزمایشی معتبر', website: 'http://spam.example',
  });
  assert.equal(spam.status, 400);

  const badEmail = await post('contact', {
    name: 'تست کیفیت', phone: '09140000003', email: 'not-an-email', subject: 'موضوع', message: 'یک پیام آزمایشی معتبر',
  });
  assert.equal(badEmail.status, 400);
  assert.ok(badEmail.body.errors.email);

  const good = await post('contact', {
    name: 'تست کیفیت', phone: '+989140000004', subject: 'پرسش آزمایشی', message: 'این پیام برای بررسی فرم تماس نوشته شده است.',
  });
  assert.equal(good.status, 201);
  assert.match(good.body.id, /^MSG-\d{8}-[A-F0-9]{6}$/);
  const contacts = fs.readFileSync(path.join(DATA_DIR, 'contacts.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(contacts.length, 1);
  assert.equal(contacts[0].phone, '09140000004');

  const admin = await fetch(BASE + '/api/admin/submissions');
  assert.equal(admin.status, 403, 'admin endpoint is closed until a token is configured');
});

test('rate limiting blocks abusive bursts from one client', async () => {
  const ip = { 'X-Forwarded-For': '203.0.113.77' };
  let saw429 = false;
  for (let i = 0; i < 10; i++) {
    const r = await post('registration', {
      name: 'تست محدودیت', phone: `0914000${String(1000 + i).padStart(4, '0')}`, course: 'massage-relaxation', message: '',
    }, ip);
    if (r.status === 429) saw429 = true;
  }
  assert.ok(saw429, 'rate limiter returned 429');
});
