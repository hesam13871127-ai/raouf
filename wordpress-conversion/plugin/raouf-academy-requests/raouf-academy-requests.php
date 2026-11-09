<?php
/**
 * Plugin Name: درخواست‌های آموزشگاه رئوف
 * Plugin URI: https://github.com/hesam13871127-ai/raouf
 * Description: ذخیره دائمی پیش‑ثبت‑نام دوره‌ها و پیام‌های تماس با ما در جدول اختصاصی وردپرس، با پیشخوان مدیریت مستقل از قالب.
 * Version: 1.0.0
 * Requires at least: 6.4
 * Requires PHP: 8.0
 * Author: Raouf Academy
 * Author URI: https://www.instagram.com/academi_raouf/
 * Text Domain: raouf-academy-requests
 * License: GPLv2 or later
 *
 * @package Raouf_Academy_Requests
 */

defined( 'ABSPATH' ) || exit;

define( 'RAOUF_REQUESTS_VERSION', '1.0.0' );
define( 'RAOUF_REQUESTS_DB_VERSION', '1.0' );
define( 'RAOUF_REQUESTS_FILE', __FILE__ );
define( 'RAOUF_REQUESTS_DIR', plugin_dir_path( __FILE__ ) );
define( 'RAOUF_REQUESTS_URL', plugin_dir_url( __FILE__ ) );

require_once RAOUF_REQUESTS_DIR . 'includes/class-raouf-requests-db.php';
require_once RAOUF_REQUESTS_DIR . 'includes/class-raouf-requests-admin.php';

register_activation_hook( RAOUF_REQUESTS_FILE, 'raouf_requests_activate' );

add_action( 'plugins_loaded', 'raouf_requests_maybe_upgrade', 5 );

/* The theme asks the active storage owner for a confirmed database write
 * before it ever returns a success response. This plugin is that owner. */
add_filter( 'raouf_store_submission', 'raouf_requests_store', 10, 4 );
