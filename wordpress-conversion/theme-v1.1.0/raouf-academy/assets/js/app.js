/* Raouf Academy — front-end behaviour. No external dependencies. */
(function () {
  'use strict';

  document.documentElement.classList.add('js');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------- utilities */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function toEnglishDigits(value) {
    return String(value)
      .replace(/[\u06F0-\u06F9]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); })
      .replace(/[\u0660-\u0669]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); });
  }
  function normalizePhone(value) {
    var p = toEnglishDigits(value).replace(/[\s\u200C\u200F\-().]/g, '');
    if (p.indexOf('00989') === 0) p = '0' + p.slice(4);
    else if (p.indexOf('+989') === 0) p = '0' + p.slice(3);
    else if (p.indexOf('989') === 0) p = '0' + p.slice(2);
    return p;
  }
  function validPhone(value) { return /^09\d{9}$/.test(normalizePhone(value)); }
  function validName(value) {
    var v = value.trim();
    return v.length >= 2 && v.length <= 80 &&
      /^[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFC\u200C\u0020A-Za-z\u00C0-\u024F'\-.]{2,80}$/.test(v);
  }
  function cookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  }

  /* --------------------------------------------------------------- header */
  var header = $('#siteHeader');
  var onScroll = function () {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 12);
    var btt = $('#backToTop');
    if (btt) btt.classList.toggle('is-shown', window.scrollY > 480);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var btt = $('#backToTop');
  if (btt) btt.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* dropdown: click/touch support in addition to CSS hover */
  $$('[data-dropdown]').forEach(function (item) {
    var toggle = $('.nav-link--toggle', item);
    if (!toggle) return;
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = item.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('click', function (e) {
    $$('[data-dropdown].is-open').forEach(function (item) {
      if (!item.contains(e.target)) {
        item.classList.remove('is-open');
        var t = $('.nav-link--toggle', item);
        if (t) t.setAttribute('aria-expanded', 'false');
      }
    });
  });

  /* mobile navigation */
  var menuToggle = $('#menuToggle');
  var mobileNav = $('#mobileNav');
  if (menuToggle && mobileNav) {
    var setMenu = function (open) {
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'بستن منوی موبایل' : 'باز کردن منوی موبایل');
      mobileNav.hidden = !open;
    };
    menuToggle.addEventListener('click', function () {
      setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
    });
    $$('a', mobileNav).forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setMenu(false);
    });
  }

  /* ------------------------------------------------------ reveal animations */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ------------------------------------------------------------- lightbox */
  var lightbox = $('#lightbox');
  if (lightbox) {
    var lbImage = $('#lightboxImage');
    var lbCaption = $('#lightboxCaption');
    var items = [];
    var current = 0;
    var lastFocused = null;

    var visibleItems = function () {
      return $$('[data-lightbox-item]').filter(function (el) { return !el.classList.contains('is-hidden') && el.offsetParent !== null; });
    };
    var render = function () {
      if (!items.length) return;
      var el = items[current];
      lbImage.src = el.getAttribute('data-full');
      lbImage.alt = el.getAttribute('data-alt') || '';
      lbCaption.textContent = el.getAttribute('data-caption') || '';
    };
    var open = function (index) {
      items = visibleItems();
      current = index;
      if (!items.length) return;
      lastFocused = document.activeElement;
      render();
      if (typeof lightbox.showModal === 'function') lightbox.showModal();
      else lightbox.setAttribute('open', '');
    };
    var close = function () {
      if (typeof lightbox.close === 'function') lightbox.close();
      else lightbox.removeAttribute('open');
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    };
    var step = function (delta) {
      if (!items.length) return;
      current = (current + delta + items.length) % items.length;
      render();
    };

    $$('[data-lightbox-item]').forEach(function (tile) {
      tile.addEventListener('click', function () {
        var list = visibleItems();
        open(Math.max(0, list.indexOf(tile)));
      });
    });
    $('[data-lightbox-close]', lightbox).addEventListener('click', close);
    $('[data-lightbox-prev]', lightbox).addEventListener('click', function () { step(-1); });
    $('[data-lightbox-next]', lightbox).addEventListener('click', function () { step(1); });
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) close();
    });
    document.addEventListener('keydown', function (e) {
      if (!lightbox.open) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') step(-1);
      else if (e.key === 'ArrowLeft') step(1);
    });
  }

  /* -------------------------------------------------------- gallery filter */
  var filterButtons = $$('.filter-btn');
  if (filterButtons.length) {
    var countLabel = $('#galleryCount');
    var emptyLabel = $('#galleryEmpty');
    filterButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cat = btn.getAttribute('data-filter');
        filterButtons.forEach(function (b) {
          var active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', String(active));
        });
        var shown = 0;
        $$('[data-lightbox-item]', $('#galleryGrid')).forEach(function (tile) {
          var visible = cat === 'all' || tile.getAttribute('data-category') === cat;
          tile.classList.toggle('is-hidden', !visible);
          tile.hidden = !visible;
          if (visible) shown++;
        });
        if (countLabel) countLabel.textContent = shown + ' تصویر';
        if (emptyLabel) emptyLabel.hidden = shown !== 0;
      });
    });
  }

  /* ----------------------------------------------------------------- forms */
  function fieldWrapper(input) {
    return input.closest('.form-field');
  }
  function setFieldError(input, message) {
    var wrap = fieldWrapper(input);
    if (!wrap) return;
    var el = $('[data-error-for="' + input.id + '"]', wrap) || $('[data-error-for="' + input.name + '"]');
    wrap.classList.toggle('has-error', Boolean(message));
    if (el) {
      el.textContent = message || '';
      el.hidden = !message;
    }
  }
  function clearErrors(form) {
    $$('input, textarea, select', form).forEach(function (i) { setFieldError(i, ''); });
  }

  function validate(form, kind) {
    var errors = {};
    var name = $('#name', form);
    var phone = $('#phone', form);
    var message = $('#message', form);

    if (!validName(name.value)) errors.name = 'لطفاً نام و نام خانوادگی معتبر (حداقل ۲ حرف) وارد کنید.';
    if (!validPhone(phone.value)) errors.phone = 'شماره موبایل معتبر نیست. مثال: ۰۹۱۴۱۰۳۲۸۷۰';
    if (kind === 'contact') {
      var email = $('#email', form);
      var subject = $('#subject', form);
      if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) errors.email = 'نشانی رایانامه معتبر نیست.';
      if (subject.value.trim().length < 2) errors.subject = 'لطفاً موضوع پیام را وارد کنید.';
      if (message.value.trim().length < 10) errors.message = 'متن پیام باید حداقل ۱۰ نویسه باشد.';
    } else {
      var course = $('#course', form);
      if (!course.value) errors.course = 'لطفاً یکی از دوره‌ها را انتخاب کنید.';
    }
    if (message && message.value.length > 1200) errors.message = 'متن پیام نباید بیشتر از ۱۲۰۰ نویسه باشد.';
    return errors;
  }

  $$('[data-form]').forEach(function (form) {
    var kind = form.getAttribute('data-form');
    var alertBox = $('[data-form-alert]', form.parentElement);
    var successBox = $('[data-form-success]', form.parentElement);
    var submitBtn = $('[data-submit]', form);
    var submitting = false;

    /* pre-select a course from /register/?course=... */
    if (kind === 'registration') {
      var select = $('#course', form);
      if (select) {
        var wanted = new URLSearchParams(window.location.search).get('course');
        if (wanted && $$('option', select).some(function (o) { return o.value === wanted; })) select.value = wanted;
      }
    }

    $$('input, textarea, select', form).forEach(function (input) {
      input.addEventListener('input', function () { setFieldError(input, ''); });
      input.addEventListener('change', function () { setFieldError(input, ''); });
    });

    function showAlert(text, isError) {
      if (!alertBox) return;
      alertBox.textContent = text;
      alertBox.className = 'form-alert ' + (isError ? 'is-error' : 'is-success');
      alertBox.hidden = false;
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (submitting) return;
      clearErrors(form);
      if (alertBox) alertBox.hidden = true;

      var errors = validate(form, kind);
      var keys = Object.keys(errors);
      if (keys.length) {
        keys.forEach(function (k) {
          var input = $('#' + k, form) || $('[name="' + k + '"]', form);
          if (input) setFieldError(input, errors[k]);
        });
        showAlert('لطفاً موارد مشخص\u200Cشده را اصلاح کنید و دوباره تلاش کنید.', true);
        var first = $('#' + keys[0], form);
        if (first) first.focus();
        return;
      }

      var payload = {
        name: $('#name', form).value.trim(),
        phone: normalizePhone($('#phone', form).value),
        message: $('#message', form) ? $('#message', form).value.trim() : '',
        website: $('input[name="website"]', form) ? $('input[name="website"]', form).value : ''
      };
      if (kind === 'registration') payload.course = $('#course', form).value;
      else {
        payload.email = $('#email', form).value.trim();
        payload.subject = $('#subject', form).value.trim();
      }

      var csrf = cookie('raouf_csrf');
      if (!csrf) {
        showAlert('نشست فرم معتبر نیست. لطفاً صفحه را بازنشانی کنید.', true);
        return;
      }

      submitting = true;
      if (submitBtn) { submitBtn.disabled = true; submitBtn.setAttribute('aria-busy', 'true'); }
      showAlert('در حال ثبت اطلاعات…', false);

      try {
        /* home_url('/') is injected by WordPress; supports sub-directory installs. */
        var base = (window.raoufForms && window.raoufForms.baseUrl)
          ? window.raoufForms.baseUrl.replace(/\/+$/, '') : '';
        var endpoint = base + (kind === 'registration' ? '/api/registrations' : '/api/contact');
        var response = await fetch(endpoint, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrf,
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        var data = await response.json().catch(function () { return {}; });
        if (!response.ok || !data.ok) {
          if (data.errors) {
            Object.keys(data.errors).forEach(function (k) {
              var input = $('#' + k, form) || $('[name="' + k + '"]', form);
              if (input) setFieldError(input, data.errors[k]);
            });
          }
          var serverMessage = data.message ||
            ('پاسخ سرور با خطا همراه بود (کد ' + response.status + '). لطفاً دوباره تلاش کنید.');
          throw new Error(serverMessage);
        }
        /* Only a successful server write reveals the success panel. */
        form.hidden = true;
        if (alertBox) alertBox.hidden = true;
        if (successBox) {
          var ref = $('[data-ref]', successBox);
          if (ref) ref.textContent = data.id;
          successBox.hidden = false;
          successBox.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        }
      } catch (err) {
        /* Entered values and the form stay visible on failure; the success
           panel is revealed only after a confirmed database write (data.ok). */
        if (alertBox) alertBox.hidden = false;
        showAlert(err.message || 'ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.', true);
      } finally {
        submitting = false;
        if (submitBtn) { submitBtn.disabled = false; submitBtn.removeAttribute('aria-busy'); }
      }
    });
  });
})();
