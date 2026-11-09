<?php
/**
 * Raouf Academy theme bootstrap.
 *
 * Exact WordPress conversion of the original HTML/CSS/JS site. The original
 * CSS (style.css), JavaScript (assets/js/app.js), fonts, images and inline
 * SVG icons are all used unchanged; only installation-specific URLs are
 * resolved through WordPress APIs.
 *
 * @package Raouf_Academy
 */

defined( 'ABSPATH' ) || exit;

define( 'RAOUF_THEME_VERSION', '1.0.0' );
define( 'RAOUF_TEXT_DOMAIN', 'raouf-academy' );

require_once get_template_directory() . '/inc/icons.php';
require_once get_template_directory() . '/inc/helpers.php';
require_once get_template_directory() . '/inc/options.php';
require_once get_template_directory() . '/inc/menus.php';
require_once get_template_directory() . '/inc/lightbox-markup.php';
require_once get_template_directory() . '/inc/nav-fallback.php';
require_once get_template_directory() . '/inc/pages-data.php';
require_once get_template_directory() . '/inc/404-markup.php';
require_once get_template_directory() . '/inc/setup.php';
require_once get_template_directory() . '/inc/forms.php';

add_action(
	'after_setup_theme',
	static function () {
		load_theme_textdomain( RAOUF_TEXT_DOMAIN, get_template_directory() . '/languages' );
		register_nav_menus(
			array(
				'raouf_primary' => __( 'منوی اصلی رئوف (هدر و موبایل)', 'raouf-academy' ),
				'raouf_courses' => __( 'منوی دوره‌های آموزشی (فوتی)', 'raouf-academy' ),
			)
		);
	}
);

/**
 * Original asset loading. The single original stylesheet is the theme's
 * style.css; the single original script keeps its exact defer behaviour.
 */
add_action(
	'wp_enqueue_scripts',
	static function () {
		wp_enqueue_style( 'raouf-academy-style', get_stylesheet_uri(), array(), RAOUF_THEME_VERSION, 'all' );

		wp_register_script(
			'raouf-academy-app',
			get_template_directory_uri() . '/assets/js/app.js',
			array(),
			RAOUF_THEME_VERSION,
			true
		);
		wp_enqueue_script( 'raouf-academy-app' );

		// Do not let core / block styles override the original design.
		wp_dequeue_style( 'wp-block-library' );
		wp_dequeue_style( 'wp-block-library-theme' );
		wp_dequeue_style( 'global-styles' );
		wp_dequeue_style( 'classic-theme-styles' );
	},
	100
);

add_filter(
	'script_loader_tag',
	static function ( $tag, $handle ) {
		if ( 'raouf-academy-app' === $handle && false === strpos( $tag, ' defer' ) ) {
			return str_replace( '<script ', '<script defer ', $tag );
		}
		return $tag;
	},
	10,
	2
);

/* Keep wp_head() minimal so no conflicting WordPress styles are injected. */
remove_action( 'wp_enqueue_scripts', 'wp_enqueue_global_styles' );
remove_action( 'wp_footer', 'wp_enqueue_global_styles', 1 );
remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
remove_action( 'wp_print_styles', 'print_emoji_styles' );
remove_action( 'wp_head', 'wp_generator' );
remove_action( 'wp_head', 'rsd_link' );
remove_action( 'wp_head', 'wlwmanifest_link' );
remove_action( 'wp_head', 'wp_shortlink_wp_head' );
/* The original markup already carries exactly one canonical link and one
   robots directive; WordPress core must not add a second one (defects D02/D03). */
remove_action( 'wp_head', 'rel_canonical', 10 );
remove_action( 'wp_head', 'wp_robots', 1 );
remove_action( 'wp_head', 'rest_output_link_wp_head' );
remove_action( 'wp_head', 'wp_oembed_add_discovery_links' );
remove_action( 'wp_head', 'wp_oembed_add_host_js' );
remove_action( 'template_redirect', 'rest_output_link_header', 11 );
remove_action( 'template_redirect', 'wp_shortlink_header', 11 );
remove_action( 'wp_footer', 'wp_print_speculation_rules' );
remove_action( 'wp_head', 'wp_print_auto_sizes_contain_css_fix', 1 );
add_filter( 'wp_resource_hints', '__return_empty_array' );

/* The original site has no admin bar; keep the front-end pixel-identical. */
add_filter( 'show_admin_bar', '__return_false' );

/* The original markup carries its own <title>; WordPress must not add a second. */
remove_action( 'wp_head', '_wp_render_title_tag', 1 );

/* Admin notice after a successful page re-sync (Stage D defect SD-03). */
add_action(
	'admin_notices',
	static function () {
		// Only an administrator can actually trigger a re-sync, so only an
		// administrator may see its confirmation. Read-only query parameter:
		// no action is taken here, but it is sanitised and capability-gated so
		// a crafted URL cannot show a false success notice to other roles.
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only UI flag.
		$flag = isset( $_GET['raouf-resynced'] ) ? sanitize_key( wp_unslash( $_GET['raouf-resynced'] ) ) : '';
		if ( '1' === $flag ) {
			echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__( 'صفحات قالب رئوف با محتوای دقیق منبع بازسازی شدند.', 'raouf-academy' ) . '</p></div>';
		}
	}
);
