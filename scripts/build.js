'use strict';

/**
 * Static site generator. Zero runtime dependencies:
 *   node scripts/build.js
 *
 * Generates one real HTML document per route under public/<route>/index.html,
 * plus robots.txt / sitemap.xml, then validates every asset and internal link.
 */

const fs = require('node:fs');
const path = require('node:path');
const { site, courses } = require('../src/data');
const { document } = require('../src/components');
const pages = require('../src/pages');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const SITE_URL = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

const defs = [];
const add = (d) => defs.push(d);

add({
  path: '/',
  pageKey: 'home',
  title: 'آموزشگاه فنی و حرفه\u200Cای رئوف | آموزش مهارت\u200Cهای تخصصی',
  description: 'آموزشگاه فنی و حرفه\u200Cای رئوف در تبریز؛ آموزش تخصصی و عملی پاکسازی و فیشیال پوست، فوریت\u200Cهای پزشکی، تکنسین داروخانه و ماساژ و ریلکسیشن. مشاوره و ثبت\u200Cنام.',
  bodyClass: 'page-home',
  withLightbox: true,
  body: pages.home(),
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: site.name,
    alternateName: 'رئوف',
    url: SITE_URL + '/',
    telephone: site.phoneTel,
    address: { '@type': 'PostalAddress', addressLocality: 'تبریز', streetAddress: site.address, addressCountry: 'IR' },
    sameAs: [site.instagramUrl],
    description: 'آموزشگاه فنی و حرفه\u200Cای رئوف؛ آموزش مهارت\u200Cهای تخصصی و کاربردی با رویکرد عملی و کارگاهی.',
  },
});

add({
  path: '/courses/',
  pageKey: 'courses',
  title: 'دوره\u200Cهای آموزشی | آموزشگاه فنی و حرفه\u200Cای رئوف',
  description: 'معرفی چهار دوره تخصصی آموزشگاه رئوف: پاکسازی و فیشیال پوست، فوریت\u200Cهای پزشکی و کمک\u200Cهای اولیه، تکنسین داروخانه و نسخه\u200Cخوانی، ماساژ و ریلکسیشن.',
  bodyClass: 'page-courses',
  body: pages.coursesIndex(),
});

for (const c of courses) {
  add({
    path: c.url,
    pageKey: `course-${c.id}`,
    title: `${c.title} | آموزشگاه رئوف`,
    description: `${c.title} — ${c.description}`.slice(0, 300),
    bodyClass: `page-course page-course--${c.accent}`,
    ogImage: `/assets/images/${c.image}.webp`,
    withLightbox: true,
    body: pages.courseDetail(c),
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: c.title,
      description: c.description,
      educationalLevel: 'دوره مهارتی',
      provider: { '@type': 'EducationalOrganization', name: site.name, url: SITE_URL + '/' },
      hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'onsite', location: { '@type': 'Place', name: site.name, address: site.address } },
      url: SITE_URL + c.url,
    },
  });
}

add({
  path: '/about/',
  pageKey: 'about',
  title: 'درباره آموزشگاه | آموزشگاه فنی و حرفه\u200Cای رئوف',
  description: 'آشنایی با آموزشگاه فنی و حرفه\u200Cای رئوف، رویکرد آموزشی، فلسفه آموزش عملی و حوزه\u200Cهای آموزشی در تبریز.',
  bodyClass: 'page-about',
  body: pages.about(),
});

add({
  path: '/gallery/',
  pageKey: 'gallery',
  title: 'گالری تصاویر | آموزشگاه فنی و حرفه\u200Cای رئوف',
  description: 'تصاویر واقعی از فضای آموزشگاه رئوف: پذیرش، کلاس\u200Cهای آموزشی، کارگاه\u200Cهای عملی، اتاق\u200Cهای درمانی و پوسترهای رسمی دوره\u200Cها.',
  bodyClass: 'page-gallery',
  withLightbox: true,
  body: pages.galleryPage(),
});

add({
  path: '/contact/',
  pageKey: 'contact',
  title: 'تماس با ما | آموزشگاه فنی و حرفه\u200Cای رئوف',
  description: `ارتباط با آموزشگاه فنی و حرفه\u200Cای رئوف. تلفن ${site.phoneDisplay}، نشانی ${site.address} و صفحه اینستاگرام academi_raouf.`,
  bodyClass: 'page-contact',
  body: pages.contact(),
});

add({
  path: '/register/',
  pageKey: 'register',
  title: 'مشاوره و ثبت\u200Cنام | آموزشگاه فنی و حرفه\u200Cای رئوف',
  description: 'فرم ثبت\u200Cنام و دریافت مشاوره دوره\u200Cهای آموزشگاه رئوف: پاکسازی و فیشیال پوست، فوریت\u200Cهای پزشکی، تکنسین داروخانه و ماساژ.',
  bodyClass: 'page-register',
  body: pages.register(),
});

add({
  path: '/404/',
  pageKey: 'notfound',
  title: 'صفحه پیدا نشد | آموزشگاه فنی و حرفه\u200Cای رئوف',
  description: 'صفحه مورد نظر پیدا نشد.',
  bodyClass: 'page-404',
  body: pages.notFound(),
});

/* ------------------------------------------------------------- generation */
fs.mkdirSync(PUBLIC, { recursive: true });
const written = [];
for (const d of defs) {
  const html = document({
    title: d.title,
    description: d.description,
    path: d.path,
    pageKey: d.pageKey,
    body: d.body,
    bodyClass: d.bodyClass,
    ogImage: d.ogImage,
    jsonLd: d.jsonLd,
    withLightbox: d.withLightbox,
  });
  const dir = path.join(PUBLIC, d.path.replace(/^\/|\/$/g, ''));
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'index.html');
  fs.writeFileSync(file, html, 'utf8');
  written.push({ path: d.path, file, html });
}

fs.writeFileSync(
  path.join(PUBLIC, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
  'utf8'
);

const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${defs
  .filter((d) => d.path !== '/404/')
  .map((d) => `  <url><loc>${SITE_URL}${d.path}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>${d.path === '/' ? '1.0' : '0.8'}</priority></url>`)
  .join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(PUBLIC, 'sitemap.xml'), sitemap, 'utf8');

/* The server uses this list to serve a host-correct sitemap dynamically. */
fs.writeFileSync(
  path.join(PUBLIC, 'routes.json'),
  JSON.stringify(defs.filter((d) => d.path !== '/404/').map((d) => d.path)),
  'utf8'
);

/* --------------------------------------------------------------- validation */
const problems = [];
const validRoutes = new Set(defs.map((d) => d.path));
for (const { path: route, file, html } of written) {
  if (/href="#"/.test(html)) problems.push(`${route}: empty anchor href="#"`);
  if (/href=""|src=""/.test(html)) problems.push(`${route}: empty href/src`);
  if (/لورم|lorem ipsum|\bTODO\b|\bTBD\b/i.test(html)) problems.push(`${route}: placeholder text`);
  if (!/dir="rtl"/.test(html) || !/lang="fa"/.test(html)) problems.push(`${route}: missing lang/dir`);

  const assets = [...html.matchAll(/(?:src|href|data-full|content)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
  for (const asset of assets) {
    const target = path.join(PUBLIC, asset.replace(/^\//, ''));
    if (!fs.existsSync(target)) problems.push(`${route}: broken asset ${asset}`);
  }
  const links = [...html.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]);
  for (const link of links) {
    if (link.startsWith('/assets/') || link.startsWith('/api/')) continue;
    if (!validRoutes.has(link)) {
      const target = path.join(PUBLIC, link.replace(/^\//, ''), 'index.html');
      if (!fs.existsSync(target)) problems.push(`${route}: broken internal link ${link}`);
    }
  }
}

if (problems.length) {
  console.error('\nBUILD VALIDATION FAILED:');
  problems.forEach((p) => console.error('  - ' + p));
  process.exit(1);
}

console.log(`Built ${written.length} pages, robots.txt, sitemap.xml and routes.json.`);
console.log('Routes:');
written.forEach((w) => console.log(`  ${w.path.padEnd(34)} ${(fs.statSync(w.file).size / 1024).toFixed(1)} KB`));
console.log('Asset and internal-link validation: OK');
