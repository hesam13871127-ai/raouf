<?php
/**
 * Uninstall cleanup. Legacy raouf_submission CPT posts are intentionally
 * preserved: removing the plugin must never destroy historical requests.
 *
 * @package Raouf_Academy_Requests
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

global $wpdb;
$table = $wpdb->prefix . 'raouf_requests';
// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- trusted table identifier.
$wpdb->query( "DROP TABLE IF EXISTS `{$table}`" );
delete_option( 'raouf_requests_db_version' );
