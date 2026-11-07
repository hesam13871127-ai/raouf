'use strict';

const {
  site,
  courses,
  whyItems,
  processSteps,
  homeFaqs,
  galleryCategories,
  gallery,
  homeGallery,
  img,
} = require('./data');
const { icon } = require('./icons');
const {
  esc,
  image,
  btn,
  sectionHead,
  breadcrumb,
  courseCard,
  faqList,
  ctaBand,
} = require('./components');

/* ------------------------------------------------------------------ helpers */

const persianNumbers = ['۰۱', '۰۲', '۰۳', '۰۴', '۰۵'];

function innerHero({ eyebrow, title, desc, crumbs, image: heroImage, imageAlt, variant = '' }) {
  return `<section class="inner-hero ${variant}">
    <div class="inner-hero-shape inner-hero-shape--a"></div>
    <div class="inner-hero-shape inner-hero-shape--b"></div>
    <div class="container inner-hero-inner">
      <div class="inner-hero-copy">
        ${breadcrumb(crumbs)}
        <span class="eyebrow eyebrow--light"><span class="eyebrow-dot"></span>${esc(eyebrow)}</span>
        <h1>${esc(title)}</h1>
        <p>${esc(desc)}</p>
      </div>
      ${
        heroImage
          ? `<div class="inner-hero-visual">${image(heroImage, imageAlt, {
              lazy: false,
              eagerFetch: true,
              sizes: '(max-width: 900px) 90vw, 38vw',
            })}<span class="inner-hero-frame"></span></div>`
          : '<div class="inner-hero-emblem" aria-hidden="true"><span>ر</span></div>'
      }
    </div>
  </section>`;
}

function quickStats() {
  const items = [
    { icon: 'layers', value: '۴', label: 'دوره تخصصی' },
    { icon: 'target', value: '۴', label: 'حوزه آموزشی' },
    { icon: 'flask', value: 'عملی', label: 'رویکرد کارگاهی' },
    { icon: 'headset', value: 'مشاوره', label: 'پیش از ثبت\u200Cنام' },
  ];
  return `<div class="quick-stats"><div class="container quick-stats-inner">
    ${items
      .map(
        (i) => `<div class="quick-stat"><span class="quick-stat-icon">${icon(i.icon, '', 22)}</span><div><strong>${esc(i.value)}</strong><span>${esc(i.label)}</span></div></div>`
      )
      .join('')}
  </div></div>`;
}

function galleryTile(g, i, extraCls = '', sizes = '(max-width: 640px) 90vw, (max-width: 1100px) 45vw, 30vw') {
  const full = img(g.file);
  return `<button type="button" class="gallery-tile ${extraCls} reveal" style="--reveal-delay:${(i % 6) * 55}ms"
      data-lightbox-item data-full="${full}" data-caption="${esc(g.caption)}" data-alt="${esc(g.alt)}"
      data-category="${esc(g.cat)}" aria-label="نمایش تصویر: ${esc(g.caption)}">
      ${image(g.file, g.alt, { sizes, cls: 'gallery-tile-img' })}
      <span class="gallery-tile-overlay">${icon('eye', '', 22)}<span>${esc(g.caption)}</span></span>
    </button>`;
}

/* --------------------------------------------------------------------- home */

function home() {
  return `
  <section class="hero">
    <div class="hero-bg-shape hero-bg-shape--one" aria-hidden="true"></div>
    <div class="hero-bg-shape hero-bg-shape--two" aria-hidden="true"></div>
    <div class="hero-grid" aria-hidden="true"></div>
    <div class="container hero-inner">
      <div class="hero-copy">
        <span class="hero-kicker"><span class="hero-kicker-line"></span>${esc(site.name)}</span>
        <h1>مسیر حرفه${'\u200C'}ای شدن <span class="hero-highlight">از آموزش اصولی</span> آغاز می${'\u200C'}شود</h1>
        <p>در آموزشگاه فنی و حرفه${'\u200C'}ای رئوف، مهارت${'\u200C'}های تخصصی و کاربردی را با آموزش عملی و کارگاهی بیاموزید و برای ورود به مسیر حرفه${'\u200C'}ای خود آماده شوید.</p>
        <div class="hero-actions">
          ${btn('مشاهده دوره\u200Cهای آموزشی', '/courses/', 'primary', 'arrowLeft')}
          ${btn('مشاوره و ثبت\u200Cنام', '/register/', 'outline-light', 'headset')}
        </div>
        <div class="hero-trust">
          <span>${icon('checkCircle', '', 18)} آموزش عملی و کارگاهی</span>
          <span>${icon('checkCircle', '', 18)} چهار مسیر آموزشی تخصصی</span>
          <span>${icon('checkCircle', '', 18)} مشاوره پیش از ثبت\u200Cنام</span>
        </div>
      </div>
      <div class="hero-visual">
        <div class="hero-image-wrap">
          ${image('hero-academy', 'گروهی از هنرجویان در حال یادگیری مهارت عملی در محیط آموزشی مدرن', {
            lazy: false,
            eagerFetch: true,
            sizes: '(max-width: 980px) 92vw, 48vw',
            cls: 'hero-image',
          })}
          <span class="hero-image-corner"></span>
        </div>
        <div class="hero-logo-card">
          <img src="${site.logo}" width="500" height="500" alt="لوگوی ${esc(site.name)}" loading="eager" decoding="async">
          <span><strong>رئوف</strong><small>آموزشگاه فنی و حرفه${'\u200C'}ای</small></span>
        </div>
        <div class="hero-float hero-float--top">
          <span class="hero-float-icon">${icon('graduationCap', '', 22)}</span>
          <span><strong>۴ دوره تخصصی</strong><small>زیبایی، پزشکی، داروخانه، ماساژ</small></span>
        </div>
        <div class="hero-float hero-float--bottom">
          <span class="hero-float-icon hero-float-icon--purple">${icon('flask', '', 22)}</span>
          <span><strong>یادگیری عملی</strong><small>تمرین در محیط کارگاهی</small></span>
        </div>
        <div class="hero-dots" aria-hidden="true"></div>
      </div>
    </div>
    <div class="hero-wave" aria-hidden="true"></div>
  </section>

  ${quickStats()}

  <section class="section intro-section" id="introduction">
    <div class="container intro-grid">
      <div class="intro-visual reveal">
        <div class="intro-main-image">${image('lounge-01', 'سالن انتظار و فضای داخلی آموزشگاه رئوف', { sizes: '(max-width: 900px) 90vw, 42vw' })}</div>
        <div class="intro-small-image">${image('reception-02', 'میز پذیرش آموزشگاه رئوف', { sizes: '(max-width: 900px) 45vw, 20vw' })}</div>
        <div class="intro-badge"><span>${icon('building', '', 22)}</span><strong>فضای آموزشی</strong><small>اختصاصی و سازمان${'\u200C'}یافته</small></div>
      </div>
      <div class="intro-copy">
        ${sectionHead({
          eyebrow: 'معرفی آموزشگاه',
          title: 'به آموزشگاه فنی و حرفه\u200Cای رئوف خوش آمدید',
          desc: 'آموزشگاهی برای یادگیری مهارت\u200Cهای تخصصی، تجربه آموزش عملی و آشنایی با مسیرهای شغلی در حوزه\u200Cهای زیبایی، پزشکی، داروخانه و ماساژ.',
        })}
        <p class="intro-lead">در رئوف، آموزش تنها به انتقال مطالب تئوری محدود نمی${'\u200C'}شود. تمرین عملی، آشنایی با ابزار و تجهیزات، و نزدیک کردن محتوای دوره به مهارت${'\u200C'}های مورد استفاده در بازار کار، بخش اصلی تجربه یادگیری است.</p>
        <ul class="intro-points">
          <li>${icon('checkCircle', '', 20)}<span>چهار مسیر آموزشی تخصصی در حوزه${'\u200C'}های پرکاربرد</span></li>
          <li>${icon('checkCircle', '', 20)}<span>رویکرد آموزش عملی، کارگاهی و مهارت${'\u200C'}محور</span></li>
          <li>${icon('checkCircle', '', 20)}<span>راهنمایی و پشتیبانی آموزشی در طول مسیر یادگیری</span></li>
        </ul>
        ${btn('درباره آموزشگاه بیشتر بدانیم', '/about/', 'navy', 'arrowLeft')}
      </div>
    </div>
  </section>

  <section class="section section--cream why-section" id="why-raouf">
    <div class="container">
      ${sectionHead({
        eyebrow: 'انتخابی آگاهانه',
        title: 'چرا آموزشگاه رئوف؟',
        desc: 'پنج ویژگی که تجربه یادگیری در رئوف را شکل می\u200Cدهد.',
        center: true,
      })}
      <div class="why-grid">
        ${whyItems
          .map(
            (w, i) => `<article class="why-card reveal" style="--reveal-delay:${i * 60}ms">
              <span class="why-icon">${icon(w.icon, '', 26)}</span>
              <span class="why-number">${persianNumbers[i]}</span>
              <h3>${esc(w.title)}</h3>
              <p>${esc(w.text)}</p>
            </article>`
          )
          .join('')}
      </div>
    </div>
  </section>

  <section class="section courses-section" id="courses">
    <div class="container">
      <div class="section-head-row">
        ${sectionHead({
          eyebrow: 'مسیرهای یادگیری',
          title: 'دوره\u200Cهای تخصصی آموزشگاه رئوف',
          desc: 'هر دوره با سرفصل\u200Cهای مشخص، آموزش عملی و رویکردی مهارت\u200Cمحور طراحی شده است.',
        })}
        ${btn('همه دوره\u200Cها', '/courses/', 'outline-navy', 'arrowLeft', 'section-head-btn')}
      </div>
      <div class="course-grid">${courses.map((c, i) => courseCard(c, i)).join('')}</div>
    </div>
  </section>

  <section class="practical-section">
    <div class="container practical-grid">
      <div class="practical-visual reveal">
        <div class="practical-image">${image('classroom-03', 'کلاس آموزشی مجهز آموزشگاه رئوف', { sizes: '(max-width: 900px) 90vw, 48vw' })}</div>
        <div class="practical-image-accent"></div>
        <div class="practical-float"><span>${icon('flask', '', 22)}</span><strong>آموزش عملی</strong><small>از تئوری تا تمرین واقعی</small></div>
      </div>
      <div class="practical-copy">
        ${sectionHead({
          eyebrow: 'یادگیری ملموس',
          title: 'یادگیری مهارت با آموزش عملی',
          desc: 'آشنایی با مهارت\u200Cهای کاربردی و تمرین عملی، بخش مهمی از مسیر یادگیری حرفه\u200Cای است.',
          light: true,
        })}
        <p>در دوره\u200Cهای رئوف، هنرجو فقط شنونده نیست. تمرین با تجهیزات، کار روی مدل و مانکن، و مواجهه با موقعیت\u200Cهای شبیه\u200Cسازی\u200Cشده، کمک می\u200Cکند آموخته\u200Cها به مهارت قابل اجرا تبدیل شوند.</p>
        <div class="practical-list">
          <div>${icon('check', '', 18)}<span>تمرین در محیط کارگاهی</span></div>
          <div>${icon('check', '', 18)}<span>آشنایی با ابزار و تجهیزات</span></div>
          <div>${icon('check', '', 18)}<span>پشتیبانی آموزشی</span></div>
        </div>
        ${btn('نگاهی به فضای آموزشگاه', '/gallery/', 'cream', 'image')}
      </div>
    </div>
  </section>

  <section class="section process-section" id="process">
    <div class="container">
      ${sectionHead({
        eyebrow: 'مسیر یادگیری',
        title: 'مسیر یادگیری در آموزشگاه رئوف',
        desc: 'پنج گام ساده، از انتخاب دوره تا ارزیابی مهارت.',
        center: true,
      })}
      <div class="process-line" aria-hidden="true"></div>
      <ol class="process-grid">
        ${processSteps
          .map(
            (s, i) => `<li class="process-step reveal" style="--reveal-delay:${i * 80}ms">
              <span class="process-node"><span>${persianNumbers[i]}</span></span>
              <h3>${esc(s.title)}</h3>
              <p>${esc(s.text)}</p>
            </li>`
          )
          .join('')}
      </ol>
    </div>
  </section>

  <section class="section section--lightlilac gallery-preview-section" id="gallery-preview">
    <div class="container">
      <div class="section-head-row">
        ${sectionHead({
          eyebrow: 'گالری تصاویر',
          title: 'نگاهی به فضای آموزشی و دوره\u200Cها',
          desc: 'تصاویری واقعی از فضا، کلاس\u200Cها و تمرین\u200Cهای عملی آموزشگاه رئوف.',
        })}
        ${btn('گالری کامل', '/gallery/', 'outline-navy', 'arrowLeft', 'section-head-btn')}
      </div>
      <div class="gallery-preview-grid">
        ${homeGallery.map((g, i) => galleryTile(g, i, `gallery-preview-${i + 1}`, '(max-width: 640px) 90vw, 33vw')).join('')}
      </div>
      <p class="gallery-hint">${icon('info', '', 17)} برای مشاهده تصویر در اندازه بزرگ روی هر تصویر کلیک کنید.</p>
    </div>
  </section>

  <section class="section faq-section" id="faq">
    <div class="container faq-grid">
      <div class="faq-aside">
        ${sectionHead({ eyebrow: 'پرسش و پاسخ', title: 'سؤالات متداول', desc: 'پاسخ پرتکرارترین پرسش\u200Cها درباره دوره\u200Cها و فرآیند ثبت\u200Cنام.' })}
        <div class="faq-help">
          <span class="faq-help-icon">${icon('headset', '', 26)}</span>
          <div><strong>پرسش دیگری دارید؟</strong><p>با آموزشگاه تماس بگیرید یا از طریق فرم تماس، سؤال خود را مطرح کنید.</p></div>
          <a href="/contact/" class="text-link">صفحه تماس با ما ${icon('arrowLeft', '', 17)}</a>
        </div>
      </div>
      ${faqList(homeFaqs, 'home-faq')}
    </div>
  </section>

  ${ctaBand({
    title: 'برای شروع مسیر حرفه\u200Cای خود آماده\u200Cاید؟',
    desc: 'برای آشنایی بیشتر با دوره\u200Cها و دریافت مشاوره با آموزشگاه رئوف در ارتباط باشید.',
    primary: { label: 'ثبت\u200Cنام در دوره\u200Cها', href: '/register/', icon: 'arrowLeft' },
    secondary: { label: 'تماس با آموزشگاه', href: `tel:${site.phoneTel}`, icon: 'phone' },
  })}
  `;
}

/* ----------------------------------------------------------- courses index */

function coursesIndex() {
  return `${innerHero({
    eyebrow: 'دوره\u200Cهای آموزشی',
    title: 'دوره\u200Cهای تخصصی آموزشگاه رئوف',
    desc: 'چهار مسیر آموزشی در حوزه\u200Cهای زیبایی، پزشکی، داروخانه و ماساژ؛ هر دوره با سرفصل\u200Cها و آموزش عملی مشخص.',
    crumbs: [{ label: 'خانه', url: '/' }, { label: 'دوره\u200Cهای آموزشی' }],
    image: 'classroom-01',
    imageAlt: 'نمایی از کلاس آموزشی آموزشگاه رئوف',
    variant: 'inner-hero--courses',
  })}

  <section class="section courses-listing-section">
    <div class="container">
      <div class="courses-intro-row reveal">
        <p>برای آشنایی با محتوای هر دوره، سرفصل\u200Cها، ویژگی\u200Cها و مخاطبان آن، صفحه اختصاصی دوره را مشاهده کنید.</p>
        <div class="courses-jump">
          ${courses.map((c) => `<a href="#${c.id}">${icon(c.icon, '', 16)} ${esc(c.shortTitle)}</a>`).join('')}
        </div>
      </div>
      <div class="course-grid course-grid--listing">
        ${courses.map((c, i) => `<div id="${c.id}" class="course-anchor">${courseCard(c, i, 'course-card--large')}</div>`).join('')}
      </div>
    </div>
  </section>

  <section class="section section--cream choose-section">
    <div class="container">
      ${sectionHead({ eyebrow: 'راهنمای انتخاب', title: 'کدام دوره برای شما مناسب است؟', center: true, desc: 'هر دوره، مخاطبان و سرفصل\u200Cهای مشخصی دارد. پیش از تصمیم\u200Cگیری می\u200Cتوانید از مشاوره آموزشگاه استفاده کنید.' })}
      <div class="choose-grid">
        ${courses
          .map(
            (c) => `<article class="choose-card reveal">
              <span class="choose-icon choose-icon--${c.accent}">${icon(c.icon, '', 24)}</span>
              <h3>${esc(c.shortTitle)}</h3>
              <p>${esc(c.category)}</p>
              <a class="text-link" href="${c.url}">مشاهده سرفصل\u200Cها ${icon('arrowLeft', '', 16)}</a>
            </article>`
          )
          .join('')}
      </div>
    </div>
  </section>

  ${ctaBand({
    title: 'برای انتخاب دوره، مشاوره بگیرید',
    desc: 'پرسش\u200Cها و اهداف خود را با ما در میان بگذارید تا مسیر مناسب\u200Cتری را بررسی کنید.',
    primary: { label: 'دریافت مشاوره و ثبت\u200Cنام', href: '/register/', icon: 'arrowLeft' },
    secondary: { label: 'تماس با آموزشگاه', href: `tel:${site.phoneTel}`, icon: 'phone' },
  })}
  `;
}

/* --------------------------------------------------------- course detail */

function courseDetail(c) {
  const others = courses.filter((x) => x.id !== c.id);
  const flipped = ['medical-emergency', 'massage-relaxation'].includes(c.id);
  return `${innerHero({
    eyebrow: c.category,
    title: c.title,
    desc: c.description,
    crumbs: [{ label: 'خانه', url: '/' }, { label: 'دوره\u200Cهای آموزشی', url: '/courses/' }, { label: c.shortTitle }],
    image: c.image,
    imageAlt: c.imageAlt,
    variant: `inner-hero--course course-hero--${c.accent} ${flipped ? 'inner-hero--flipped' : ''}`,
  })}

  <div class="course-meta-bar"><div class="container course-meta-inner">
    <div>${icon('layers', '', 18)}<strong>${c.syllabus.length}</strong> سرفصل آموزشی</div>
    <div>${icon('graduationCap', '', 18)}<strong>${c.features.length}</strong> ویژگی دوره</div>
    <div>${icon('users', '', 18)}<strong>${c.audience.length}</strong> گروه مخاطب</div>
    <a class="btn btn--primary btn--sm" href="/register/?course=${c.id}">ثبت${'\u200C'}نام در این دوره ${icon('arrowLeft', '', 16)}</a>
  </div></div>

  <section class="section course-intro-section">
    <div class="container course-intro-grid">
      <div class="course-intro-copy">
        ${sectionHead({ eyebrow: 'معرفی دوره', title: 'آشنایی کامل با دوره', desc: c.description })}
        <p class="course-intro-note">${icon('info', '', 18)} ${esc(c.summary)}</p>
        <div class="course-intro-actions">
          ${btn('ثبت\u200Cنام و دریافت مشاوره', `/register/?course=${c.id}`, 'primary', 'arrowLeft')}
          ${btn('تماس با آموزشگاه', `tel:${site.phoneTel}`, 'outline-navy', 'phone')}
        </div>
      </div>
      <div class="course-intro-visual reveal">
        <div class="course-main-image">${image(c.gallery[1] || c.image, `تصویری از فضا و آموزش\u200Cهای دوره ${esc(c.shortTitle)}`, { sizes: '(max-width: 900px) 90vw, 42vw' })}<span class="course-image-label">${icon('image', '', 16)} ${esc(c.category)}</span></div>
        <div class="course-side-image">${image(c.gallery[2] || c.practicalImage, `نمای دیگری از آموزش\u200Cهای ${esc(c.shortTitle)}`, { sizes: '(max-width: 900px) 45vw, 20vw' })}</div>
      </div>
    </div>
  </section>

  <section class="section section--cream syllabus-section" id="syllabus">
    <div class="container syllabus-grid">
      <div class="syllabus-copy">
        ${sectionHead({ eyebrow: 'برنامه آموزشی', title: 'سرفصل\u200Cهای دوره', desc: 'مطالبی که در طول دوره پوشش داده می\u200Cشود.' })}
        <div class="syllabus-note">${icon('bookOpen', '', 20)}<p>سرفصل\u200Cها بر اساس معرفی رسمی دوره تنظیم شده\u200Cاند و تمرین عملی در کنار آموزش تئوری قرار دارد.</p></div>
      </div>
      <ol class="syllabus-list">
        ${c.syllabus
          .map(
            (s, i) => `<li class="reveal" style="--reveal-delay:${(i % 5) * 50}ms"><span class="syllabus-num">${String(i + 1).padStart(2, '0')}</span><span>${esc(s)}</span>${icon('check', 'syllabus-check', 17)}</li>`
          )
          .join('')}
      </ol>
    </div>
  </section>

  <section class="section outcomes-section" id="outcomes">
    <div class="container">
      ${sectionHead({ eyebrow: 'نتایج یادگیری', title: 'پس از این دوره با چه مهارت\u200Cهایی آشنا می\u200Cشوید؟', center: true })}
      <div class="outcomes-grid">
        ${c.outcomes
          .map(
            (o, i) => `<article class="outcome-card reveal" style="--reveal-delay:${i * 60}ms"><span>${icon('checkCircle', '', 22)}</span><p>${esc(o)}</p></article>`
          )
          .join('')}
      </div>
    </div>
  </section>

  <section class="section section--lightblue features-section" id="features">
    <div class="container">
      ${sectionHead({ eyebrow: 'ویژگی\u200Cها', title: 'ویژگی\u200Cهای دوره', center: true, desc: 'آنچه در معرفی رسمی این دوره اعلام شده است.' })}
      <div class="features-grid">
        ${c.features
          .map(
            (f, i) => `<div class="feature-card reveal" style="--reveal-delay:${i * 50}ms"><span class="feature-icon">${icon(['award', 'flask', 'users', 'layers', 'headset', 'target'][i % 6], '', 23)}</span><span>${esc(f)}</span></div>`
          )
          .join('')}
      </div>
      ${c.notice ? `<div class="course-notice">${icon('alert', '', 21)}<p>${esc(c.notice)}</p></div>` : ''}
    </div>
  </section>

  <section class="section audience-section" id="audience">
    <div class="container audience-grid">
      <div>
        ${sectionHead({ eyebrow: 'مخاطبان دوره', title: 'این دوره مناسب چه کسانی است؟', desc: 'گروه\u200Cهایی که در معرفی رسمی دوره به عنوان مخاطب معرفی شده\u200Cاند.' })}
        <ul class="audience-list">
          ${c.audience.map((a) => `<li>${icon('checkCircle', '', 20)}<span>${esc(a)}</span></li>`).join('')}
        </ul>
      </div>
      <div class="audience-card">
        <span class="audience-card-icon">${icon('headset', '', 28)}</span>
        <h3>هنوز مطمئن نیستید؟</h3>
        <p>پیش از ثبت${'\u200C'}نام می${'\u200C'}توانید پرسش${'\u200C'}های خود را درباره سرفصل${'\u200C'}ها، شرایط برگزاری و مسیر یادگیری مطرح کنید.</p>
        ${btn('دریافت مشاوره', '/contact/', 'cream', 'arrowLeft')}
      </div>
    </div>
  </section>

  <section class="practical-section practical-section--course">
    <div class="container practical-grid ${flipped ? 'practical-grid--flipped' : ''}">
      <div class="practical-visual reveal">
        <div class="practical-image">${image(c.practicalImage, `آموزش عملی دوره ${esc(c.shortTitle)}`, { sizes: '(max-width: 900px) 90vw, 48vw' })}</div>
        <div class="practical-image-accent"></div>
        <div class="practical-float"><span>${icon('flask', '', 22)}</span><strong>آموزش عملی</strong><small>تمرین در کنار تئوری</small></div>
      </div>
      <div class="practical-copy">
        ${sectionHead({ eyebrow: 'بخش عملی', title: c.practicalTitle, desc: c.practicalText, light: true })}
        <div class="practical-list">
          <div>${icon('check', '', 18)}<span>آموزش عملی و کارگاهی</span></div>
          <div>${icon('check', '', 18)}<span>راهنمایی و پشتیبانی آموزشی</span></div>
          <div>${icon('check', '', 18)}<span>ارائه گواهی پایان دوره طبق شرایط مربوطه</span></div>
        </div>
        ${btn('ثبت\u200Cنام در این دوره', `/register/?course=${c.id}`, 'cream', 'arrowLeft')}
      </div>
    </div>
  </section>

  <section class="section course-gallery-section">
    <div class="container">
      ${sectionHead({ eyebrow: 'نگاهی نزدیک\u200Cتر', title: `تصاویری از فضای آموزشی ${esc(c.shortTitle)}`, center: true })}
      <div class="course-gallery-grid">
        ${c.gallery.map((g, i) => {
          const match = gallery.find((x) => x.file === g);
          return galleryTile(
            match || { file: g, cat: 'course', alt: `تصویری از دوره ${c.shortTitle}`, caption: c.category },
            i,
            '',
            '(max-width: 640px) 90vw, 24vw'
          );
        }).join('')}
      </div>
    </div>
  </section>

  <section class="section section--cream course-faq-section">
    <div class="container">
      ${sectionHead({ eyebrow: 'پرسش و پاسخ', title: 'سؤالات متداول این دوره', center: true })}
      <div class="faq-list faq-list--wide">${faqList(c.faqs, `faq-${c.id}`)}</div>
    </div>
  </section>

  ${ctaBand({
    title: 'همین حالا برای این دوره اقدام کنید',
    desc: `درخواست خود را برای دوره «${c.shortTitle}» ثبت کنید یا برای دریافت اطلاعات بیشتر با آموزشگاه تماس بگیرید.`,
    primary: { label: 'ثبت\u200Cنام در دوره', href: `/register/?course=${c.id}`, icon: 'arrowLeft' },
    secondary: { label: 'تماس با آموزشگاه', href: `tel:${site.phoneTel}`, icon: 'phone' },
    id: 'register-cta',
  })}

  <section class="section related-section">
    <div class="container">
      ${sectionHead({ eyebrow: 'ادامه مسیر', title: 'دوره\u200Cهای مرتبط', desc: 'سایر مسیرهای آموزشی آموزشگاه رئوف را نیز ببینید.' })}
      <div class="course-grid course-grid--related">
        ${others.map((o, i) => courseCard(o, i, 'course-card--compact')).join('')}
      </div>
    </div>
  </section>
  `;
}

/* -------------------------------------------------------------------- about */

function about() {
  return `${innerHero({
    eyebrow: 'درباره آموزشگاه',
    title: 'آموزشگاه فنی و حرفه\u200Cای رئوف',
    desc: 'فضایی برای یادگیری مهارت\u200Cهای تخصصی و کاربردی، با تکیه بر آموزش عملی و همراهی آموزشی.',
    crumbs: [{ label: 'خانه', url: '/' }, { label: 'درباره آموزشگاه' }],
    image: 'reception-02',
    imageAlt: 'فضای پذیرش آموزشگاه فنی و حرفه\u200Cای رئوف',
    variant: 'inner-hero--about',
  })}

  <section class="section about-intro-section">
    <div class="container about-intro-grid">
      <div class="about-intro-copy">
        ${sectionHead({ eyebrow: 'معرفی ما', title: 'مهارت\u200Cآموزی، از یادگیری تا به\u200Cکارگیری', desc: 'آموزشگاهی برای یادگیری مهارت\u200Cهای تخصصی، تجربه آموزش عملی و آشنایی با مسیرهای شغلی در حوزه\u200Cهای زیبایی، پزشکی، داروخانه و ماساژ.' })}
        <p>رئوف با تمرکز بر آموزش مهارت\u200Cمحور، چهار مسیر آموزشی تخصصی را در اختیار علاقه${'\u200C'}مندان قرار می${'\u200C'}دهد. هدف، ایجاد تجربه${'\u200C'}ای است که در آن هنرجو علاوه بر آشنایی با مفاهیم، فرصت تمرین و نزدیک شدن به فضای واقعی کار را داشته باشد.</p>
        <p>راهنمایی پیش از ثبت${'\u200C'}نام، پشتیبانی آموزشی و توجه به نیازهای بازار کار، از اصولی هستند که در طراحی دوره${'\u200C'}ها مد نظر قرار می${'\u200C'}گیرند.</p>
      </div>
      <div class="about-intro-visual reveal">
        <div class="about-image-main">${image('lounge-01', 'سالن انتظار آموزشگاه رئوف', { sizes: '(max-width: 900px) 90vw, 42vw' })}</div>
        <div class="about-image-side">${image('reception-01', 'میز پذیرش آموزشگاه', { sizes: '(max-width: 900px) 45vw, 20vw' })}</div>
      </div>
    </div>
  </section>

  <section class="section section--cream approach-section">
    <div class="container">
      ${sectionHead({ eyebrow: 'رویکرد آموزشی', title: 'چگونه آموزش می\u200Cدهیم؟', center: true, desc: 'سه اصل ثابت در تمام دوره\u200Cهای آموزشگاه.' })}
      <div class="approach-grid">
        <article class="approach-card reveal"><span>${icon('bookOpen', '', 27)}</span><strong>آموزش تخصصی</strong><p>سرفصل\u200Cهای مشخص و متمرکز بر مهارت، متناسب با هر حوزه آموزشی.</p></article>
        <article class="approach-card reveal" style="--reveal-delay:80ms"><span>${icon('flask', '', 27)}</span><strong>تمرین عملی</strong><p>کارگاه، تمرین روی مدل و مانکن، و آشنایی با تجهیزات رایج هر حوزه.</p></article>
        <article class="approach-card reveal" style="--reveal-delay:160ms"><span>${icon('headset', '', 27)}</span><strong>همراهی آموزشی</strong><p>مشاوره پیش از ثبت\u200Cنام و پشتیبانی در طول مسیر یادگیری.</p></article>
      </div>
    </div>
  </section>

  <section class="practical-section practical-section--about">
    <div class="container practical-grid practical-grid--flipped">
      <div class="practical-visual reveal">
        <div class="practical-image">${image('first-aid-02', 'کارگاه آموزش عملی کمک\u200Cهای اولیه در آموزشگاه رئوف', { sizes: '(max-width: 900px) 90vw, 48vw' })}</div>
        <div class="practical-image-accent"></div>
        <div class="practical-float"><span>${icon('flask', '', 22)}</span><strong>فلسفه آموزش عملی</strong><small>یادگیری با انجام دادن</small></div>
      </div>
      <div class="practical-copy">
        ${sectionHead({ eyebrow: 'فلسفه ما', title: 'یادگیری زمانی ماندگار می\u200Cشود که انجام شود', desc: 'آشنایی با مهارت\u200Cهای کاربردی و تمرین عملی، بخش مهمی از مسیر یادگیری حرفه\u200Cای است.', light: true })}
        <p>به همین دلیل، تمرین عملی به جای یک بخش حاشیه${'\u200C'}ای، در قلب دوره${'\u200C'}ها قرار دارد. هنرجو با ابزار، فضا و موقعیت${'\u200C'}های کاری آشنا می${'\u200C'}شود و آموخته${'\u200C'}های خود را در عمل محک می${'\u200C'}زند.</p>
        ${btn('مشاهده کلاس\u200Cها و فضاها', '/gallery/', 'cream', 'image')}
      </div>
    </div>
  </section>

  <section class="section fields-section">
    <div class="container">
      ${sectionHead({ eyebrow: 'حوزه\u200Cهای آموزشی', title: 'چهار حوزه، چهار مسیر شغلی', center: true, desc: 'دوره\u200Cهای تخصصی آموزشگاه در حوزه\u200Cهای زیر ارائه می\u200Cشوند.' })}
      <div class="fields-grid">
        ${courses
          .map(
            (c) => `<a class="field-card reveal" href="${c.url}">
              <span class="field-icon field-icon--${c.accent}">${icon(c.icon, '', 26)}</span>
              <strong>${esc(c.shortTitle)}</strong>
              <span class="field-category">${esc(c.category)}</span>
              <span class="field-more">مشاهده دوره ${icon('arrowLeft', '', 16)}</span>
            </a>`
          )
          .join('')}
      </div>
    </div>
  </section>

  <section class="section section--cream brand-section">
    <div class="container brand-grid">
      <div class="brand-copy">
        ${sectionHead({ eyebrow: 'هویت بصری', title: 'لوگو و مراجع رسمی برند رئوف', desc: 'رنگ\u200Cها و نشانه\u200Cهای به\u200Cکاررفته در این وب\u200Cسایت، برگرفته از لوگو، پوستر رسمی و تابلوی آموزشگاه است.' })}
        <p>نشانه رئوف، ترکیب نیروی انسانی و بال\u200Cهای گیاه\u200Cگونه را در کنار نشان سلامت قرار می\u200Cدهد. بنفش و یاسی به عنوان رنگ\u200Cهای ثانویه لوگو، در کنار سرمه\u200Cای و آبی اصلی و زمینه\u200Cهای کرم و سفید، زبان بصری وب\u200Cسایت را شکل می\u200Cدهند.</p>
        <ul class="brand-points">
          <li>${icon('checkCircle', '', 19)} لوگوی اصلی، بدون تغییر و بدون کشیدگی</li>
          <li>${icon('checkCircle', '', 19)} پوستر رسمی معرفی دوره\u200Cها</li>
          <li>${icon('checkCircle', '', 19)} تابلوی آموزشگاه به عنوان سند بصری واقعی</li>
        </ul>
      </div>
      <div class="brand-visual reveal">
        <div class="brand-poster">${image('poster-courses', 'پوستر رسمی معرفی دوره\u200Cهای آموزشگاه رئوف', { sizes: '(max-width: 900px) 45vw, 22vw' })}</div>
        <div class="brand-stack">
          <div class="brand-sign">${image('sign-board', 'تابلوی آموزشگاه فنی و حرفه\u200Cای آزاد رئوف', { sizes: '(max-width: 900px) 45vw, 26vw' })}</div>
          <div class="brand-logo-chip">
            <img src="${site.logo}" width="500" height="500" alt="لوگوی رسمی آموزشگاه فنی و حرفه\u200Cای رئوف" loading="lazy" decoding="async">
            <span><strong>لوگوی رسمی آموزشگاه</strong><small>همان فایل اصلی، با حفظ تناسب</small></span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="section section--lightlilac about-values-section">
    <div class="container">
      ${sectionHead({ eyebrow: 'آنچه برای ما مهم است', title: 'تعهد آموزشگاه رئوف', center: true })}
      <div class="why-grid why-grid--compact">
        ${whyItems.map((w, i) => `<article class="why-card reveal" style="--reveal-delay:${i * 55}ms"><span class="why-icon">${icon(w.icon, '', 24)}</span><h3>${esc(w.title)}</h3><p>${esc(w.text)}</p></article>`).join('')}
      </div>
    </div>
  </section>

  ${ctaBand({
    title: 'در کنار شما، از اولین قدم',
    desc: 'برای آشنایی بیشتر با آموزشگاه و دوره\u200Cها، با ما در ارتباط باشید.',
    primary: { label: 'تماس با ما', href: '/contact/', icon: 'arrowLeft' },
    secondary: { label: 'مشاوره و ثبت\u200Cنام', href: '/register/', icon: 'headset' },
  })}
  `;
}

/* ------------------------------------------------------------------ gallery */

function galleryPage() {
  const counts = {};
  gallery.forEach((g) => (counts[g.cat] = (counts[g.cat] || 0) + 1));
  return `${innerHero({
    eyebrow: 'گالری تصاویر',
    title: 'نگاهی به فضای آموزشگاه رئوف',
    desc: 'تصاویری واقعی از پذیرش، کلاس\u200Cها، کارگاه\u200Cهای عملی، اتاق\u200Cهای درمانی و تابلوی آموزشگاه.',
    crumbs: [{ label: 'خانه', url: '/' }, { label: 'گالری تصاویر' }],
    image: 'classroom-03',
    imageAlt: 'کلاس آموزشی آموزشگاه رئوف',
    variant: 'inner-hero--gallery',
  })}

  <section class="section gallery-section">
    <div class="container">
      <div class="gallery-toolbar reveal">
        <div class="gallery-filters" role="group" aria-label="فیلتر تصاویر">
          ${galleryCategories
            .map(
              (cat) => `<button type="button" class="filter-btn ${cat.id === 'all' ? 'is-active' : ''}" data-filter="${cat.id}" aria-pressed="${cat.id === 'all'}">${esc(cat.label)}<span>${cat.id === 'all' ? gallery.length : counts[cat.id] || 0}</span></button>`
            )
            .join('')}
        </div>
        <p class="gallery-count" id="galleryCount">${gallery.length} تصویر</p>
      </div>
      <div class="gallery-grid" id="galleryGrid">
        ${gallery.map((g, i) => galleryTile(g, i, '', '(max-width: 640px) 90vw, (max-width: 1100px) 45vw, 30vw')).join('')}
      </div>
      <p class="gallery-empty" id="galleryEmpty" hidden>تصویری در این دسته وجود ندارد.</p>
      <div class="gallery-note">${icon('info', '', 19)}<p>تصاویر این صفحه، عکس${'\u200C'}های واقعی از فضای آموزشگاه رئوف هستند. برای مشاهده در اندازه کامل، روی هر تصویر کلیک کنید و با کلیدهای جهت\u200Cنما یا دکمه\u200Cهای کناری بین تصاویر جابه\u200Cجا شوید.</p></div>
    </div>
  </section>

  ${ctaBand({
    title: 'فضای آموزشی را از نزدیک ببینید',
    desc: 'برای بازدید، مشاوره و اطلاع از شرایط دوره\u200Cها با آموزشگاه رئوف تماس بگیرید.',
    primary: { label: 'تماس با آموزشگاه', href: '/contact/', icon: 'arrowLeft' },
    secondary: { label: 'مشاهده دوره\u200Cها', href: '/courses/', icon: 'layers' },
  })}
  `;
}

/* ------------------------------------------------------------------ contact */

function formField({ id, label, type = 'text', required = false, placeholder = '', hint = '', attrs = '' }) {
  return `<div class="form-field">
    <label for="${id}">${esc(label)}${required ? '<span class="req" aria-hidden="true">*</span>' : ''}</label>
    <input id="${id}" name="${id}" type="${type}" ${required ? 'required' : ''} placeholder="${esc(placeholder)}" ${attrs} autocomplete="off">
    ${hint ? `<small>${esc(hint)}</small>` : ''}
    <span class="field-error" data-error-for="${id}" role="alert" hidden></span>
  </div>`;
}

function contact() {
  return `${innerHero({
    eyebrow: 'تماس با ما',
    title: 'با آموزشگاه رئوف در ارتباط باشید',
    desc: 'برای مشاوره، اطلاع از شرایط دوره\u200Cها یا هماهنگی بازدید، از راه\u200Cهای زیر استفاده کنید.',
    crumbs: [{ label: 'خانه', url: '/' }, { label: 'تماس با ما' }],
    variant: 'inner-hero--contact',
  })}

  <section class="section contact-cards-section">
    <div class="container contact-cards">
      <article class="contact-card reveal"><span class="contact-card-icon">${icon('phone', '', 26)}</span><h2>شماره تماس</h2><a href="tel:${site.phoneTel}" dir="ltr">${esc(site.phoneDisplay)}</a><p>برای مشاوره و هماهنگی، مستقیماً تماس بگیرید.</p></article>
      <article class="contact-card reveal" style="--reveal-delay:70ms"><span class="contact-card-icon contact-card-icon--purple">${icon('mapPin', '', 26)}</span><h2>نشانی آموزشگاه</h2><p class="contact-address">${esc(site.address)}</p><a class="text-link" href="${site.mapSearchUrl}" target="_blank" rel="noopener noreferrer">جستجوی آدرس روی نقشه ${icon('external', '', 15)}</a></article>
      <article class="contact-card reveal" style="--reveal-delay:140ms"><span class="contact-card-icon contact-card-icon--lilac">${icon('instagram', '', 26)}</span><h2>اینستاگرام</h2><a href="${site.instagramUrl}" target="_blank" rel="noopener noreferrer">${esc(site.instagramUser)}</a><p>صفحه رسمی آموزشگاه رئوف را دنبال کنید.</p></article>
    </div>
  </section>

  <section class="section section--cream contact-form-section">
    <div class="container contact-grid">
      <div class="contact-form-side">
        ${sectionHead({ eyebrow: 'پیام شما', title: 'برای ما پیام بگذارید', desc: 'پرسش\u200Cها و درخواست\u200Cهای خود را بنویسید. پیام شما ثبت و در اختیار مسئولان آموزشگاه قرار می\u200Cگیرد.' })}
        <div class="contact-side-box">
          <h3>${icon('info', '', 20)} اطلاعات تماس</h3>
          <ul>
            <li>${icon('phone', '', 17)}<a href="tel:${site.phoneTel}" dir="ltr">${esc(site.phoneDisplay)}</a></li>
            <li>${icon('mapPin', '', 17)}<span>${esc(site.address)}</span></li>
            <li>${icon('instagram', '', 17)}<a href="${site.instagramUrl}" target="_blank" rel="noopener noreferrer">${esc(site.instagramUser)}</a></li>
          </ul>
          <p class="map-disclaimer">نقطه دقیق مکانی روی نقشه درج نشده است؛ از لینک جستجوی آدرس برای مسیریابی استفاده کنید.</p>
        </div>
      </div>
      <div class="form-card reveal">
        <form id="contactForm" data-form="contact" novalidate>
          <div class="form-row">
            ${formField({ id: 'name', label: 'نام و نام خانوادگی', required: true, placeholder: 'نام خود را وارد کنید', attrs: 'autocomplete="name" minlength="2" maxlength="80"' })}
            ${formField({ id: 'phone', label: 'شماره تماس', type: 'tel', required: true, placeholder: '۰۹۱۴...', attrs: 'inputmode="tel" autocomplete="tel" maxlength="20"' })}
          </div>
          <div class="form-row">
            ${formField({ id: 'email', label: 'رایانامه (اختیاری)', type: 'email', placeholder: 'name@example.com', attrs: 'autocomplete="email" maxlength="120"' })}
            ${formField({ id: 'subject', label: 'موضوع پیام', required: true, placeholder: 'موضوع پیام خود را بنویسید', attrs: 'maxlength="120"' })}
          </div>
          <div class="form-field">
            <label for="message">متن پیام<span class="req" aria-hidden="true">*</span></label>
            <textarea id="message" name="message" rows="6" required minlength="10" maxlength="1200" placeholder="پرسش یا درخواست خود را بنویسید..."></textarea>
            <span class="field-error" data-error-for="message" role="alert" hidden></span>
          </div>
          <div class="hp-field" aria-hidden="true"><label for="website-contact">وب\u200Cسایت</label><input id="website-contact" name="website" type="text" tabindex="-1" autocomplete="off"></div>
          <div class="form-footer">
            <p>فیلدهای ستاره${'\u200C'}دار الزامی هستند.</p>
            <button type="submit" class="btn btn--primary" data-submit>${icon('send', '', 18)} ارسال پیام</button>
          </div>
          <div class="form-alert" data-form-alert role="status" hidden></div>
        </form>
        <div class="form-success" data-form-success hidden>
          <span class="form-success-icon">${icon('checkCircle', '', 40)}</span>
          <h3>پیام شما با موفقیت ثبت شد</h3>
          <p>از ارتباط شما سپاسگزاریم. پیام ثبت و در اختیار مسئولان آموزشگاه قرار گرفت.</p>
          <p class="form-ref">شماره پیگیری: <strong data-ref></strong></p>
          <div class="form-success-actions">${btn('بازگشت به خانه', '/', 'outline-navy')}${btn('ارسال پیام دیگر', '/contact/', 'navy', 'plus')}</div>
        </div>
      </div>
    </div>
  </section>

  ${ctaBand({
    title: 'ترجیح می\u200Cدهید مستقیم صحبت کنید؟',
    desc: 'با شماره آموزشگاه تماس بگیرید تا درباره دوره\u200Cها و شرایط برگزاری راهنمایی بگیرید.',
    primary: { label: 'تماس با آموزشگاه', href: `tel:${site.phoneTel}`, icon: 'phone' },
    secondary: { label: 'مشاوره و ثبت\u200Cنام', href: '/register/', icon: 'arrowLeft' },
  })}
  `;
}

/* --------------------------------------------------------------- register */

function register() {
  return `${innerHero({
    eyebrow: 'مشاوره و ثبت\u200Cنام',
    title: 'اولین قدم را برای یادگیری بردارید',
    desc: 'فرم زیر را تکمیل کنید تا درخواست مشاوره و ثبت\u200Cنام شما ثبت شود. تنها از اطلاعات رسمی آموزشگاه برای ارتباط استفاده کنید.',
    crumbs: [{ label: 'خانه', url: '/' }, { label: 'مشاوره و ثبت\u200Cنام' }],
    variant: 'inner-hero--register',
  })}

  <section class="section register-section">
    <div class="container register-grid">
      <div class="register-side">
        ${sectionHead({ eyebrow: 'فرم ثبت\u200Cنام', title: 'مشاوره و ثبت\u200Cنام در دوره\u200Cها', desc: 'چهار فیلد ساده، یک درخواست شفاف. پس از ثبت موفق، شماره پیگیری دریافت می\u200Cکنید.' })}
        <ol class="register-steps">
          <li><span>۰۱</span><div><strong>تکمیل فرم</strong><p>نام، شماره تماس، دوره مورد نظر و توضیحات خود را بنویسید.</p></div></li>
          <li><span>۰۲</span><div><strong>ثبت درخواست</strong><p>اطلاعات ثبت و شماره پیگیری به شما نمایش داده می\u200Cشود.</p></div></li>
          <li><span>۰۳</span><div><strong>هماهنگی و مشاوره</strong><p>مسئولان آموزشگاه جهت ارائه اطلاعات دوره با شما ارتباط برقرار می\u200Cکنند.</p></div></li>
        </ol>
        <div class="register-side-contact">
          <a href="tel:${site.phoneTel}">${icon('phone', '', 20)} <span dir="ltr">${esc(site.phoneDisplay)}</span></a>
          <a href="${site.instagramUrl}" target="_blank" rel="noopener noreferrer">${icon('instagram', '', 20)} ${esc(site.instagramUser)}</a>
        </div>
        <div class="register-privacy">${icon('shield', '', 20)}<p>اطلاعات شما فقط برای پیگیری درخواست ثبت\u200Cنام ذخیره می\u200Cشود و در اختیار شخص ثالث قرار نمی\u200Cگیرد.</p></div>
      </div>

      <div class="form-card form-card--register reveal">
        <div class="form-card-header"><span>${icon('clipboard', '', 22)}</span><div><strong>فرم درخواست ثبت\u200Cنام</strong><small>تمام فیلدهای ستاره${'\u200C'}دار الزامی هستند</small></div></div>
        <form id="registerForm" data-form="registration" novalidate>
          <div class="form-row">
            ${formField({ id: 'name', label: 'نام و نام خانوادگی', required: true, placeholder: 'نام و نام خانوادگی خود را وارد کنید', attrs: 'autocomplete="name" minlength="2" maxlength="80"' })}
            ${formField({ id: 'phone', label: 'شماره تماس', type: 'tel', required: true, placeholder: '۰۹۱۴...', attrs: 'inputmode="tel" autocomplete="tel" maxlength="20"', hint: 'شماره موبایل ۱۱ رقمی، با ارقام فارسی یا لاتین' })}
          </div>
          <div class="form-field">
            <label for="course">انتخاب دوره<span class="req" aria-hidden="true">*</span></label>
            <select id="course" name="course" required data-preselect>
              <option value="">لطفاً دوره مورد نظر را انتخاب کنید</option>
              ${courses.map((c) => `<option value="${c.id}">${esc(c.title)}</option>`).join('')}
            </select>
            <span class="field-error" data-error-for="course" role="alert" hidden></span>
          </div>
          <div class="form-field">
            <label for="message">توضیحات و سؤال</label>
            <textarea id="message" name="message" rows="5" maxlength="1200" placeholder="اگر سؤال یا توضیحی دارید، اینجا بنویسید (اختیاری)"></textarea>
            <span class="field-error" data-error-for="message" role="alert" hidden></span>
          </div>
          <div class="hp-field" aria-hidden="true"><label for="website-register">وب\u200Cسایت</label><input id="website-register" name="website" type="text" tabindex="-1" autocomplete="off"></div>
          <div class="form-footer">
            <p>با ارسال فرم، درخواست شما ثبت می\u200Cشود.</p>
            <button type="submit" class="btn btn--primary" data-submit>${icon('send', '', 18)} ثبت درخواست</button>
          </div>
          <div class="form-alert" data-form-alert role="status" hidden></div>
        </form>
        <div class="form-success" data-form-success hidden>
          <span class="form-success-icon">${icon('checkCircle', '', 40)}</span>
          <h3>درخواست شما با موفقیت ثبت شد</h3>
          <p>اطلاعات شما ذخیره و در اختیار مسئولان آموزشگاه قرار گرفت. شماره پیگیری زیر را نزد خود نگه دارید.</p>
          <p class="form-ref">شماره پیگیری: <strong data-ref></strong></p>
          <div class="form-success-actions">${btn('مشاهده دوره\u200Cها', '/courses/', 'outline-navy')}${btn('ثبت درخواست دیگر', '/register/', 'navy', 'plus')}</div>
        </div>
      </div>
    </div>
  </section>

  <section class="section section--lightblue register-faq-section">
    <div class="container">
      ${sectionHead({ eyebrow: 'پیش از ثبت\u200Cنام', title: 'سؤالات متداول', center: true })}
      <div class="faq-list faq-list--wide">${faqList(homeFaqs.slice(0, 4), 'register-faq')}</div>
    </div>
  </section>

  ${ctaBand({
    title: 'سؤالی دارید؟ تماس بگیرید',
    desc: 'پیش از ثبت\u200Cنام می\u200Cتوانید با شماره آموزشگاه تماس بگیرید و مشاوره بگیرید.',
    primary: { label: 'تماس با آموزشگاه', href: `tel:${site.phoneTel}`, icon: 'phone' },
    secondary: { label: 'صفحه تماس با ما', href: '/contact/', icon: 'arrowLeft' },
  })}
  `;
}

/* ---------------------------------------------------------------------- 404 */

function notFound() {
  return `<section class="section error-section"><div class="container error-inner">
    <span class="error-code">۴۰۴</span>
    <h1>صفحه مورد نظر پیدا نشد</h1>
    <p>نشانی واردشده وجود ندارد یا منتقل شده است. می\u200Cتوانید به صفحه اصلی بازگردید یا دوره\u200Cها را مشاهده کنید.</p>
    <div class="error-actions">${btn('بازگشت به خانه', '/', 'primary', 'arrowLeft')}${btn('دوره\u200Cهای آموزشی', '/courses/', 'outline-navy', 'layers')}</div>
  </div></section>`;
}

module.exports = { home, coursesIndex, courseDetail, about, galleryPage, contact, register, notFound };
