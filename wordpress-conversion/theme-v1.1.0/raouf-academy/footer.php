<?php
/**
 * Original footer, sticky mobile bar, back-to-top and lightbox.
 * @package Raouf_Academy
 */
defined( 'ABSPATH' ) || exit;
echo '</main>';
$raouf_html_4 = <<<'RAOUF_FOOTER_0'

<footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-brand">
        <a class="footer-logo" href="{{LINK:/}}" aria-label="صفحه اصلی {{SITE_NAME}}"><img src="{{ASSET:images/raouf-logo.jpg}}" width="500" height="500" alt="لوگوی {{SITE_NAME}}" loading="lazy" decoding="async"></a>
        <p>{{FOOTER_INTRO}}</p>
        <a class="footer-social" href="{{INSTA_URL}}" target="_blank" rel="noopener noreferrer"><svg class="icon " width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><path d="M17.5 6.5h.01"/></svg> <span>{{INSTA_USER}}</span> <svg class="icon " width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg></a>
      </div>
      <div class="footer-col">
        <h3>ناوبری سریع</h3>
        
RAOUF_FOOTER_0;
echo raouf_expand_tokens( $raouf_html_4 ); // phpcs:ignore WordPress.Security.EscapeOutput -- exact static source markup/SVG; dynamic tokens are escaped.
raouf_footer_menu();
$raouf_html_5 = <<<'RAOUF_FOOTER_2'

      </div>
      <div class="footer-col">
        <h3>دوره‌های آموزشی</h3>
        
RAOUF_FOOTER_2;
echo raouf_expand_tokens( $raouf_html_5 ); // phpcs:ignore WordPress.Security.EscapeOutput -- exact static source markup/SVG; dynamic tokens are escaped.
raouf_courses_menu();
$raouf_html_6 = <<<'RAOUF_FOOTER_4'

      </div>
      <div class="footer-col footer-contact">
        <h3>ارتباط با ما</h3>
        <ul>
          <li><svg class="icon " width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg><a href="tel:{{PHONE_TEL}}" dir="ltr">{{PHONE_DISPLAY}}</a></li>
          <li><svg class="icon " width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg><span>{{ADDRESS}}</span></li>
          <li><svg class="icon " width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><path d="M17.5 6.5h.01"/></svg><a href="{{INSTA_URL}}" target="_blank" rel="noopener noreferrer">{{INSTA_USER}}</a></li>
          <li><svg class="icon " width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m3 11 19-9-9 19-2-8z"/></svg><a href="https://balad.ir/p/29UbcoR7CtjsIN" target="_blank" rel="noopener noreferrer">جستجوی آدرس روی نقشه</a></li>
        </ul>
      </div>
    </div>
    <div class="container footer-bottom">
      <p>© {{YEAR}} {{SITE_NAME}}. تمامی حقوق محفوظ است.</p>
      <p>آموزش مهارت، سرمایه‌گذاری برای آینده‌ای حرفه‌ای</p>
    </div>
  </footer>
<div class="mobile-call-bar" aria-label="دسترسی سریع">
    <a href="tel:{{PHONE_TEL}}" class="mobile-call-bar-call"><svg class="icon " width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg> تماس با آموزشگاه</a>
    <a href="{{LINK:/register/}}" class="mobile-call-bar-register">ثبت‌نام <svg class="icon " width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg></a>
  </div>
<button type="button" class="back-to-top" id="backToTop" aria-label="بازگشت به بالای صفحه" title="بازگشت به بالا"><svg class="icon " width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg></button>

RAOUF_FOOTER_4;
echo raouf_expand_tokens( $raouf_html_6 ); // phpcs:ignore WordPress.Security.EscapeOutput -- exact static source markup/SVG; dynamic tokens are escaped.
if ( raouf_meta( 'lightbox' ) ) { raouf_lightbox_markup(); }
$raouf_html_7 = <<<'RAOUF_FOOTER_6'



RAOUF_FOOTER_6;
echo raouf_expand_tokens( $raouf_html_7 ); // phpcs:ignore WordPress.Security.EscapeOutput -- exact static source markup/SVG; dynamic tokens are escaped.
wp_footer();
?>
</body>
</html>
