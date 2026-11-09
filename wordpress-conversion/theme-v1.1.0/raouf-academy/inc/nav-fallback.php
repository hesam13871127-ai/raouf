<?php
/** Exact original menu markup, used when no WP menu is assigned. */
defined( 'ABSPATH' ) || exit;
function raouf_nav_fallback( $which ) {
	switch ( $which ) {
		case 'primary':
$raouf_html_9 = <<<'RAOUF_FB_PRIMARY'
<nav class="desktop-nav" aria-label="ناوبری اصلی"><ul class="nav-list"><li><a class="nav-link is-active" href="{{LINK:/}}">خانه</a></li><li class="has-dropdown" data-dropdown>
          <button type="button" class="nav-link nav-link--toggle" aria-expanded="false" aria-controls="coursesDropdown">دوره‌های آموزشی<svg class="icon nav-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"/></svg></button>
          <div class="dropdown" id="coursesDropdown">
            <span class="dropdown-title">دوره‌های تخصصی</span>
            <a href="{{LINK:/courses/skin-facial/}}" class="dropdown-link"><svg class="icon " width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="m19 16 .7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/></svg><span>پاکسازی و فیشیال پوست</span><svg class="icon dropdown-arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m15 18-6-6 6-6"/></svg></a><a href="{{LINK:/courses/medical-emergency/}}" class="dropdown-link"><svg class="icon " width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 3v6a5 5 0 0 0 10 0V3"/><path d="M4 3H2m12 0h2"/><path d="M9 14v2a5 5 0 0 0 10 0v-1"/><circle cx="19" cy="12" r="2"/></svg><span>فوریت‌های پزشکی و کمک‌های اولیه</span><svg class="icon dropdown-arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m15 18-6-6 6-6"/></svg></a><a href="{{LINK:/courses/pharmacy-technician/}}" class="dropdown-link"><svg class="icon " width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m10.5 20.5-7-7a4.95 4.95 0 0 1 7-7l7 7a4.95 4.95 0 0 1-7 7z"/><path d="m8.5 8.5 7 7"/></svg><span>تکنسین داروخانه و نسخه‌خوانی</span><svg class="icon dropdown-arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m15 18-6-6 6-6"/></svg></a><a href="{{LINK:/courses/massage-relaxation/}}" class="dropdown-link"><svg class="icon " width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M11 20A7 7 0 0 1 4 13c0-6 8-10 16-10 0 8-4 16-10 16z"/><path d="M4 21c3-5 7-9 13-11"/></svg><span>ماساژ و ریلکسیشن</span><svg class="icon dropdown-arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m15 18-6-6 6-6"/></svg></a>
            <a href="{{LINK:/courses/}}" class="dropdown-all">همه دوره‌ها <svg class="icon " width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg></a>
          </div>
        </li><li><a class="nav-link" href="{{LINK:/about/}}">درباره آموزشگاه</a></li><li><a class="nav-link" href="{{LINK:/gallery/}}">گالری تصاویر</a></li><li><a class="nav-link" href="{{LINK:/contact/}}">تماس با ما</a></li></ul></nav>
RAOUF_FB_PRIMARY;
echo raouf_expand_tokens( $raouf_html_9 ); // phpcs:ignore WordPress.Security.EscapeOutput -- exact static source markup/SVG; dynamic tokens are escaped.
			break;
		case 'mobile':
$raouf_html_10 = <<<'RAOUF_FB_MOBILE'

          <a class="mobile-link is-active" href="{{LINK:/}}">خانه</a><details class="mobile-sub" >
          <summary class="mobile-link mobile-link--summary">دوره‌های آموزشی<svg class="icon " width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"/></svg></summary>
          <div class="mobile-sub-links">
            <a href="{{LINK:/courses/skin-facial/}}">پاکسازی و فیشیال پوست</a><a href="{{LINK:/courses/medical-emergency/}}">فوریت‌های پزشکی و کمک‌های اولیه</a><a href="{{LINK:/courses/pharmacy-technician/}}">تکنسین داروخانه و نسخه‌خوانی</a><a href="{{LINK:/courses/massage-relaxation/}}">ماساژ و ریلکسیشن</a>
            <a href="{{LINK:/courses/}}">همه دوره‌ها</a>
          </div>
        </details><a class="mobile-link" href="{{LINK:/about/}}">درباره آموزشگاه</a><a class="mobile-link" href="{{LINK:/gallery/}}">گالری تصاویر</a><a class="mobile-link" href="{{LINK:/contact/}}">تماس با ما</a>
          <div class="mobile-nav-actions">
            <a class="btn btn--primary" href="{{LINK:/register/}}">مشاوره و ثبت‌نام</a>
            <a class="btn btn--ghost-dark" href="tel:{{PHONE_TEL}}"><svg class="icon " width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg> <span dir="ltr">{{PHONE_DISPLAY}}</span></a>
          </div>
          <a class="mobile-nav-insta" href="{{INSTA_URL}}" target="_blank" rel="noopener noreferrer"><svg class="icon " width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><path d="M17.5 6.5h.01"/></svg> {{INSTA_USER}}</a>
RAOUF_FB_MOBILE;
echo raouf_expand_tokens( $raouf_html_10 ); // phpcs:ignore WordPress.Security.EscapeOutput -- exact static source markup/SVG; dynamic tokens are escaped.
			break;
		case 'footer':
$raouf_html_11 = <<<'RAOUF_FB_FOOTER'
<ul><li><a href="{{LINK:/}}">خانه</a></li><li><a href="{{LINK:/courses/}}">دوره‌های آموزشی</a></li><li><a href="{{LINK:/about/}}">درباره آموزشگاه</a></li><li><a href="{{LINK:/gallery/}}">گالری تصاویر</a></li><li><a href="{{LINK:/contact/}}">تماس با ما</a></li><li><a href="{{LINK:/register/}}">مشاوره و ثبت‌نام</a></li></ul>
RAOUF_FB_FOOTER;
echo raouf_expand_tokens( $raouf_html_11 ); // phpcs:ignore WordPress.Security.EscapeOutput -- exact static source markup/SVG; dynamic tokens are escaped.
			break;
		case 'courses':
$raouf_html_12 = <<<'RAOUF_FB_COURSES'
<ul><li><a href="{{LINK:/courses/skin-facial/}}">پاکسازی و فیشیال پوست</a></li><li><a href="{{LINK:/courses/medical-emergency/}}">فوریت‌های پزشکی و کمک‌های اولیه</a></li><li><a href="{{LINK:/courses/pharmacy-technician/}}">تکنسین داروخانه و نسخه‌خوانی</a></li><li><a href="{{LINK:/courses/massage-relaxation/}}">ماساژ و ریلکسیشن</a></li></ul>
RAOUF_FB_COURSES;
echo raouf_expand_tokens( $raouf_html_12 ); // phpcs:ignore WordPress.Security.EscapeOutput -- exact static source markup/SVG; dynamic tokens are escaped.
			break;
	}
}
