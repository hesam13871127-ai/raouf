<?php
/** Exact original 404 main content. */
defined( 'ABSPATH' ) || exit;
function raouf_404_markup() {
$raouf_html_13 = <<<'RAOUF_404'
<section class="section error-section"><div class="container error-inner">
    <span class="error-code">۴۰۴</span>
    <h1>صفحه مورد نظر پیدا نشد</h1>
    <p>نشانی واردشده وجود ندارد یا منتقل شده است. می‌توانید به صفحه اصلی بازگردید یا دوره‌ها را مشاهده کنید.</p>
    <div class="error-actions"><a class="btn btn--primary " href="{{LINK:/}}">بازگشت به خانه<svg class="icon btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg></a><a class="btn btn--outline-navy " href="{{LINK:/courses/}}">دوره‌های آموزشی<svg class="icon btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m12 2 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg></a></div>
  </div></section>
RAOUF_404;
echo raouf_expand_tokens( $raouf_html_13 ); // phpcs:ignore WordPress.Security.EscapeOutput -- exact static source markup/SVG; dynamic tokens are escaped.
}
