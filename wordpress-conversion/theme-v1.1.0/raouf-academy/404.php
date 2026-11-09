<?php
/** Exact original 404 page. @package Raouf_Academy */
defined( 'ABSPATH' ) || exit;
raouf_set_meta( array(
	'title'       => 'صفحه پیدا نشد | ' . raouf_option( 'site_name' ),
	'description' => 'صفحه مورد نظر پیدا نشد.',
	'canonical'   => raouf_current_path(),
	'og_image'    => 'assets/images/hero-academy.webp',
	'og_url'      => '',
	'page_key'    => 'notfound',
	'body_class'  => 'page-404',
	'jsonld'      => '',
	'lightbox'    => false,
) );
get_header();
raouf_404_markup();
get_footer();
