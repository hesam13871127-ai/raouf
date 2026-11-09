<?php
/** Exact original lightbox dialog. */
defined( 'ABSPATH' ) || exit;
function raouf_lightbox_markup() {
$raouf_html_8 = <<<'RAOUF_LIGHTBOX'
<dialog class="lightbox" id="lightbox" aria-label="نمایشگر تصاویر">
    <button type="button" class="lightbox-close" data-lightbox-close aria-label="بستن نمایشگر"><svg class="icon " width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    <button type="button" class="lightbox-nav lightbox-prev" data-lightbox-prev aria-label="تصویر قبلی"><svg class="icon " width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m9 18 6-6-6-6"/></svg></button>
    <figure>
      <img id="lightboxImage" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="">
      <figcaption id="lightboxCaption"></figcaption>
    </figure>
    <button type="button" class="lightbox-nav lightbox-next" data-lightbox-next aria-label="تصویر بعدی"><svg class="icon " width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m15 18-6-6 6-6"/></svg></button>
  </dialog>
RAOUF_LIGHTBOX;
echo raouf_expand_tokens( $raouf_html_8 ); // phpcs:ignore WordPress.Security.EscapeOutput -- exact static source markup/SVG; dynamic tokens are escaped.
}
