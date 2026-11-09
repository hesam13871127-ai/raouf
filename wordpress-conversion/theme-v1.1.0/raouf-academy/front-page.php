<?php
/**
 * Exact original homepage template (WordPress front page).
 * @package Raouf_Academy
 */
defined( 'ABSPATH' ) || exit;
raouf_prepare_meta_for_current_page();
get_header();
if ( have_posts() ) {
	while ( have_posts() ) {
		the_post();
		echo raouf_expand_tokens( get_post()->post_content ); // phpcs:ignore WordPress.Security.EscapeOutput
	}
}
get_footer();
