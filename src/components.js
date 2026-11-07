'use strict';

const { site, nav, courses, img } = require('./data');
const { icon } = require('./icons');
const dimensions = require('./dimensions.json');

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const baseUrl = () => (process.env.SITE_URL || '').replace(/\/+$/, '');

/** Responsive image with a small variant in srcset. `lazy` defaults to true. */
function image(file, alt, opts = {}) {
  const { lazy = true, sizes = '(max-width: 720px) 100vw, 50vw', cls = '', eagerFetch = false } = opts;
  const full = file.endsWith('.jpg') ? `/assets/images/${file}` : img(file);
  const small = file.endsWith('.jpg') ? full : img(file, true);
  const dim = file.endsWith('.jpg')
    ? dimensions[file]
    : dimensions[`${file}.webp`];
  const dimAttr = dim ? ` width="${dim[0]}" height="${dim[1]}"` : '';
  const srcset = small === full ? '' : ` srcset="${small} ${dimensions[`${file}-sm.webp`]?.[0] || 720}w, ${full} ${dim?.[0] || 1600}w"`;
  return `<img class="${cls}" src="${full}"${srcset} sizes="${sizes}" alt="${esc(alt)}"${dimAttr} loading="${lazy ? 'lazy' : 'eager'}" ${eagerFetch ? 'fetchpriority="high"' : ''} decoding="async">`;
}

function btn(label, href, variant = 'primary', iconName = null, extra = '') {
  const ic = iconName ? icon(iconName, 'btn-icon', 18) : '';
  return `<a class="btn btn--${variant} ${extra}" href="${href}">${esc(label)}${ic}</a>`;
}

function sectionHead({ eyebrow = '', title = '', desc = '', center = false, light = false } = {}) {
  return `<div class="section-head ${center ? 'section-head--center' : ''} ${light ? 'section-head--light' : ''} reveal">
    ${eyebrow ? `<span class="eyebrow"><span class="eyebrow-dot"></span>${esc(eyebrow)}</span>` : ''}
    ${title ? `<h2>${esc(title)}</h2>` : ''}
    ${desc ? `<p>${esc(desc)}</p>` : ''}
  </div>`;
}

function breadcrumb(items) {
  return `<nav class="breadcrumb" aria-label="مسیر صفحه"><ol>
    ${items
      .map(
        (it, i) =>
          `<li>${it.url ? `<a href="${it.url}">${esc(it.label)}</a>` : `<span aria-current="page">${esc(it.label)}</span>`}${
            i < items.length - 1 ? icon('chevronLeft', 'breadcrumb-sep', 15) : ''
          }</li>`
      )
      .join('')}
  </ol></nav>`;
}

function header(pageKey = '') {
  const links = nav
    .map((item) => {
      const active = item.key === pageKey ? ' is-active' : '';
      if (item.dropdown === 'courses') {
        return `<li class="has-dropdown" data-dropdown>
          <button type="button" class="nav-link nav-link--toggle${active}" aria-expanded="false" aria-controls="coursesDropdown">${esc(item.label)}${icon('chevronDown', 'nav-chevron', 16)}</button>
          <div class="dropdown" id="coursesDropdown">
            <span class="dropdown-title">دوره‌های تخصصی</span>
            ${courses
              .map(
                (c) =>
                  `<a href="${c.url}" class="dropdown-link">${icon(c.icon, '', 19)}<span>${esc(c.navLabel)}</span>${icon('chevronLeft', 'dropdown-arrow', 15)}</a>`
              )
              .join('')}
            <a href="/courses/" class="dropdown-all">همه دوره‌ها ${icon('arrowLeft', '', 16)}</a>
          </div>
        </li>`;
      }
      return `<li><a class="nav-link${active}" href="${item.url}">${esc(item.label)}</a></li>`;
    })
    .join('');

  const mobileLinks = nav
    .map((item) => {
      const active = item.key === pageKey ? ' is-active' : '';
      if (item.dropdown === 'courses') {
        return `<details class="mobile-sub" ${pageKey.startsWith('course') ? 'open' : ''}>
          <summary class="mobile-link mobile-link--summary${active}">${esc(item.label)}${icon('chevronDown', '', 18)}</summary>
          <div class="mobile-sub-links">
            ${courses.map((c) => `<a href="${c.url}">${esc(c.navLabel)}</a>`).join('')}
            <a href="/courses/">همه دوره‌ها</a>
          </div>
        </details>`;
      }
      return `<a class="mobile-link${active}" href="${item.url}">${esc(item.label)}</a>`;
    })
    .join('');

  return `<div class="header-topbar">
      <div class="container header-topbar-inner">
        <span>${icon('mapPin', '', 14)} ${esc(site.address)}</span>
        <span class="header-topbar-social">
          <a href="${site.instagramUrl}" target="_blank" rel="noopener noreferrer">${icon('instagram', '', 14)} ${esc(site.instagramUser)}</a>
          <a href="tel:${site.phoneTel}">${icon('phone', '', 14)} <span dir="ltr">${esc(site.phoneDisplay)}</span></a>
        </span>
      </div>
    </div>
    <header class="site-header" id="siteHeader">
      <div class="container header-inner">
        <a class="brand" href="/" aria-label="صفحه اصلی ${esc(site.name)}">
          <span class="brand-logo"><img src="${site.logo}" width="500" height="500" alt="لوگوی ${esc(site.name)}" loading="eager" decoding="async"></span>
          <span class="brand-text"><strong>آموزشگاه فنی و حرفه‌ای رئوف</strong><small>مرجع آموزش مهارت‌های تخصصی</small></span>
        </a>
        <nav class="desktop-nav" aria-label="ناوبری اصلی"><ul class="nav-list">${links}</ul></nav>
        <div class="header-actions">
          <a class="header-phone" href="tel:${site.phoneTel}" aria-label="تماس با ${esc(site.phoneDisplay)}">${icon('phone', '', 19)}<span dir="ltr">${esc(site.phoneDisplay)}</span></a>
          <a class="btn btn--primary btn--sm header-cta" href="/register/">مشاوره و ثبت${'\u200C'}نام ${icon('arrowLeft', '', 16)}</a>
          <button type="button" class="menu-toggle" id="menuToggle" aria-label="باز کردن منوی موبایل" aria-expanded="false" aria-controls="mobileNav">${icon('menu', 'menu-open-icon', 24)}${icon('close', 'menu-close-icon', 24)}</button>
        </div>
      </div>
      <div class="mobile-nav" id="mobileNav" hidden>
        <div class="mobile-nav-inner">
          ${mobileLinks}
          <div class="mobile-nav-actions">
            <a class="btn btn--primary" href="/register/">مشاوره و ثبت${'\u200C'}نام</a>
            <a class="btn btn--ghost-dark" href="tel:${site.phoneTel}">${icon('phone', '', 18)} <span dir="ltr">${esc(site.phoneDisplay)}</span></a>
          </div>
          <a class="mobile-nav-insta" href="${site.instagramUrl}" target="_blank" rel="noopener noreferrer">${icon('instagram', '', 18)} ${esc(site.instagramUser)}</a>
        </div>
      </div>
    </header>`;
}

function footer() {
  const year = new Date().getFullYear();
  return `<footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-brand">
        <a class="footer-logo" href="/" aria-label="صفحه اصلی ${esc(site.name)}"><img src="${site.logo}" width="500" height="500" alt="لوگوی ${esc(site.name)}" loading="lazy" decoding="async"></a>
        <p>آموزشگاه فنی و حرفه‌ای رئوف، فضایی برای یادگیری مهارت‌های تخصصی و کاربردی در حوزه‌های زیبایی، پزشکی، داروخانه و ماساژ با رویکرد آموزش عملی.</p>
        <a class="footer-social" href="${site.instagramUrl}" target="_blank" rel="noopener noreferrer">${icon('instagram', '', 19)} <span>${esc(site.instagramUser)}</span> ${icon('external', '', 14)}</a>
      </div>
      <div class="footer-col">
        <h3>ناوبری سریع</h3>
        <ul>${nav.map((n) => `<li><a href="${n.url}">${esc(n.label)}</a></li>`).join('')}<li><a href="/register/">مشاوره و ثبت${'\u200C'}نام</a></li></ul>
      </div>
      <div class="footer-col">
        <h3>دوره‌های آموزشی</h3>
        <ul>${courses.map((c) => `<li><a href="${c.url}">${esc(c.navLabel)}</a></li>`).join('')}</ul>
      </div>
      <div class="footer-col footer-contact">
        <h3>ارتباط با ما</h3>
        <ul>
          <li>${icon('phone', '', 18)}<a href="tel:${site.phoneTel}" dir="ltr">${esc(site.phoneDisplay)}</a></li>
          <li>${icon('mapPin', '', 18)}<span>${esc(site.address)}</span></li>
          <li>${icon('instagram', '', 18)}<a href="${site.instagramUrl}" target="_blank" rel="noopener noreferrer">${esc(site.instagramUser)}</a></li>
          <li>${icon('navigation', '', 18)}<a href="${site.mapSearchUrl}" target="_blank" rel="noopener noreferrer">جستجوی آدرس روی نقشه</a></li>
        </ul>
      </div>
    </div>
    <div class="container footer-bottom">
      <p>© ${year} ${esc(site.name)}. تمامی حقوق محفوظ است.</p>
      <p>آموزش مهارت، سرمایه${'\u200C'}گذاری برای آینده${'\u200C'}ای حرفه${'\u200C'}ای</p>
    </div>
  </footer>`;
}

function mobileBar() {
  return `<div class="mobile-call-bar" aria-label="دسترسی سریع">
    <a href="tel:${site.phoneTel}" class="mobile-call-bar-call">${icon('phone', '', 18)} تماس با آموزشگاه</a>
    <a href="/register/" class="mobile-call-bar-register">ثبت${'\u200C'}نام ${icon('arrowLeft', '', 16)}</a>
  </div>`;
}

function backToTop() {
  return `<button type="button" class="back-to-top" id="backToTop" aria-label="بازگشت به بالای صفحه" title="بازگشت به بالا">${icon('arrowUp', '', 20)}</button>`;
}

function lightbox() {
  return `<dialog class="lightbox" id="lightbox" aria-label="نمایشگر تصاویر">
    <button type="button" class="lightbox-close" data-lightbox-close aria-label="بستن نمایشگر">${icon('close', '', 24)}</button>
    <button type="button" class="lightbox-nav lightbox-prev" data-lightbox-prev aria-label="تصویر قبلی">${icon('chevronRight', '', 26)}</button>
    <figure>
      <img id="lightboxImage" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="">
      <figcaption id="lightboxCaption"></figcaption>
    </figure>
    <button type="button" class="lightbox-nav lightbox-next" data-lightbox-next aria-label="تصویر بعدی">${icon('chevronLeft', '', 26)}</button>
  </dialog>`;
}

function courseCard(c, index, variant = '') {
  const n = ['۰۱', '۰۲', '۰۳', '۰۴'][index] || String(index + 1);
  return `<article class="course-card course-card--${c.accent} ${variant} reveal" style="--reveal-delay:${index * 70}ms">
    <a class="course-card-media" href="${c.url}" aria-label="${esc(c.title)}">
      ${image(c.image, c.imageAlt, { cls: 'course-card-img', sizes: '(max-width: 640px) 92vw, (max-width: 1100px) 45vw, 24vw' })}
      <span class="course-card-badge">${esc(c.category)}</span>
      <span class="course-card-icon">${icon(c.icon, '', 24)}</span>
    </a>
    <div class="course-card-body">
      <span class="course-card-number">${n} / ۰۴</span>
      <h3><a href="${c.url}">${esc(c.title)}</a></h3>
      <p>${esc(c.summary)}</p>
      <div class="course-card-footer">
        <a class="text-link" href="${c.url}">جزئیات دوره ${icon('arrowLeft', '', 17)}</a>
        <span class="course-card-tag">${icon('layers', '', 15)} ${c.syllabus.length} سرفصل</span>
      </div>
    </div>
  </article>`;
}

function faqList(items, name = 'faq') {
  return `<div class="faq-list">${items
    .map(
      (f, i) => `<details class="faq-item reveal" name="${name}" ${i === 0 ? 'open' : ''} style="--reveal-delay:${i * 50}ms">
        <summary><span class="faq-index">${String(i + 1).padStart(2, '0')}</span><span class="faq-question">${esc(f.q)}</span><span class="faq-toggle">${icon('plus', 'faq-plus', 18)}${icon('minus', 'faq-minus', 18)}</span></summary>
        <div class="faq-answer"><p>${esc(f.a)}</p></div>
      </details>`
    )
    .join('')}</div>`;
}

function ctaBand({ title, desc, primary, secondary, id = 'contact-cta' }) {
  return `<section class="cta-band" id="${id}">
    <div class="cta-decor cta-decor--one"></div><div class="cta-decor cta-decor--two"></div>
    <div class="container cta-band-inner reveal">
      <div class="cta-band-copy">
        <span class="eyebrow eyebrow--light"><span class="eyebrow-dot"></span>گام بعدی</span>
        <h2>${esc(title)}</h2>
        <p>${esc(desc)}</p>
      </div>
      <div class="cta-band-actions">
        ${btn(primary.label, primary.href, 'cream', primary.icon || 'arrowLeft')}
        ${btn(secondary.label, secondary.href, 'outline-light', secondary.icon || 'phone')}
      </div>
    </div>
  </section>`;
}

function document({
  title,
  description,
  path,
  pageKey,
  body,
  bodyClass = '',
  ogImage = '/assets/images/hero-academy.webp',
  jsonLd = null,
  withLightbox = false,
}) {
  const base = baseUrl();
  /* Relative canonicals are valid and stay correct on any deployment host. */
  const canonical = `<link rel="canonical" href="${base ? base + path : path}">`;
  const ogUrl = base ? `<meta property="og:url" content="${base}${path}">` : '';
  const ogImageUrl = base ? base + ogImage : ogImage;
  const ld = jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : '';
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#303D62">
<meta name="robots" content="index, follow">
<meta name="author" content="${esc(site.name)}">
${canonical}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${ogImageUrl}">
${ogUrl}
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${site.logo}" type="image/jpeg">
<link rel="preload" href="/assets/fonts/vazirmatn-arabic-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/style.css">
${ld}
</head>
<body data-page="${esc(pageKey)}" class="${bodyClass}">
<a class="skip-link" href="#main">پرش به محتوای اصلی</a>
${header(pageKey)}
<main id="main">${body}</main>
${footer()}
${mobileBar()}
${backToTop()}
${withLightbox ? lightbox() : ''}
<script src="/assets/js/app.js" defer></script>
</body>
</html>
`;
}

module.exports = {
  esc,
  image,
  btn,
  sectionHead,
  breadcrumb,
  header,
  footer,
  mobileBar,
  backToTop,
  lightbox,
  courseCard,
  faqList,
  ctaBand,
  document,
};
