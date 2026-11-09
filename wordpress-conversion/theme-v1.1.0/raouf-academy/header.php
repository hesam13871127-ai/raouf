<?php
/**
 * Original document head + site header, preserved exactly.
 * @package Raouf_Academy
 */
defined( 'ABSPATH' ) || exit;
$raouf_view_meta = raouf_meta_all();
?><!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title><?php echo esc_html( $raouf_view_meta['title'] ); ?></title>
<meta name="description" content="<?php echo esc_attr( $raouf_view_meta['description'] ); ?>">
<meta name="theme-color" content="#303D62">
<meta name="robots" content="index, follow">
<meta name="author" content="<?php echo esc_attr( raouf_option( 'site_name' ) ); ?>">
<link rel="canonical" href="<?php echo esc_attr( $raouf_view_meta['canonical'] ); ?>">
<meta property="og:type" content="website">
<meta property="og:site_name" content="<?php echo esc_attr( raouf_option( 'site_name' ) ); ?>">
<meta property="og:title" content="<?php echo esc_attr( $raouf_view_meta['title'] ); ?>">
<meta property="og:description" content="<?php echo esc_attr( $raouf_view_meta['description'] ); ?>">
<meta property="og:image" content="<?php echo esc_url( raouf_asset_url( $raouf_view_meta['og_image'] ) ); ?>">
<?php if ( ! empty( $raouf_view_meta['og_url'] ) ) : ?>
<meta property="og:url" content="<?php echo esc_url( $raouf_view_meta['og_url'] ); ?>">
<?php endif; ?>
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="<?php echo esc_url( raouf_asset_url( 'assets/images/raouf-logo.jpg' ) ); ?>" type="image/jpeg">
<link rel="preload" href="<?php echo esc_url( raouf_asset_url( 'assets/fonts/vazirmatn-arabic-wght-normal.woff2' ) ); ?>" as="font" type="font/woff2" crossorigin>
<?php wp_head(); ?>
<?php if ( ! empty( $raouf_view_meta['jsonld'] ) ) : ?>
<script type="application/ld+json"><?php echo raouf_expand_tokens( $raouf_view_meta['jsonld'] ); // phpcs:ignore WordPress.Security.EscapeOutput ?></script>
<?php endif; ?>
</head>
<body <?php body_class( $raouf_view_meta['body_class'] ); ?> data-page="<?php echo esc_attr( $raouf_view_meta['page_key'] ); ?>">
<?php
$raouf_html_1 = <<<'RAOUF_HEADER_A'

<a class="skip-link" href="#main">پرش به محتوای اصلی</a>
<div class="header-topbar">
      <div class="container header-topbar-inner">
        <span><svg class="icon " width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg> {{ADDRESS}}</span>
        <span class="header-topbar-social">
          <a href="{{INSTA_URL}}" target="_blank" rel="noopener noreferrer"><svg class="icon " width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><path d="M17.5 6.5h.01"/></svg> {{INSTA_USER}}</a>
          <a href="tel:{{PHONE_TEL}}"><svg class="icon " width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg> <span dir="ltr">{{PHONE_DISPLAY}}</span></a>
        </span>
      </div>
    </div>
    <header class="site-header" id="siteHeader">
      <div class="container header-inner">
        <a class="brand" href="{{LINK:/}}" aria-label="صفحه اصلی {{SITE_NAME}}">
          <span class="brand-logo"><img src="{{ASSET:images/raouf-logo.jpg}}" width="500" height="500" alt="لوگوی {{SITE_NAME}}" loading="eager" decoding="async"></span>
          <span class="brand-text"><strong>{{SITE_NAME}}</strong><small>مرجع آموزش مهارت‌های تخصصی</small></span>
        </a>
        
RAOUF_HEADER_A;
echo raouf_expand_tokens( $raouf_html_1 ); // phpcs:ignore WordPress.Security.EscapeOutput -- exact static source markup/SVG; dynamic tokens are escaped.
raouf_primary_menu();
$raouf_html_2 = <<<'RAOUF_HEADER_B_0'

        <div class="header-actions">
          <a class="header-phone" href="tel:{{PHONE_TEL}}" aria-label="تماس با {{PHONE_DISPLAY}}"><svg class="icon " width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span dir="ltr">{{PHONE_DISPLAY}}</span></a>
          <a class="btn btn--primary btn--sm header-cta" href="{{LINK:/register/}}">مشاوره و ثبت‌نام <svg class="icon " width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg></a>
          <button type="button" class="menu-toggle" id="menuToggle" aria-label="باز کردن منوی موبایل" aria-expanded="false" aria-controls="mobileNav"><svg class="icon menu-open-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 6h18M3 12h18M3 18h18"/></svg><svg class="icon menu-close-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        </div>
      </div>
      <div class="mobile-nav" id="mobileNav" hidden>
        <div class="mobile-nav-inner">
RAOUF_HEADER_B_0;
echo raouf_expand_tokens( $raouf_html_2 ); // phpcs:ignore WordPress.Security.EscapeOutput -- exact static source markup/SVG; dynamic tokens are escaped.
raouf_mobile_menu();
$raouf_html_3 = <<<'RAOUF_HEADER_B_2'

        </div>
      </div>
    </header>

RAOUF_HEADER_B_2;
echo raouf_expand_tokens( $raouf_html_3 ); // phpcs:ignore WordPress.Security.EscapeOutput -- exact static source markup/SVG; dynamic tokens are escaped.

echo '<main id="main">';
