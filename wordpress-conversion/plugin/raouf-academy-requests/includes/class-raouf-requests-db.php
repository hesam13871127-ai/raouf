<?php
/**
 * Permanent storage for Raouf Academy form requests.
 *
 * @package Raouf_Academy_Requests
 */

defined( 'ABSPATH' ) || exit;

function raouf_requests_table_name() {
	global $wpdb;
	return $wpdb->prefix . 'raouf_requests';
}

function raouf_requests_table_exists() {
	global $wpdb;
	$table = raouf_requests_table_name();
	$found = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $table ) ) );
	return $found === $table;
}

function raouf_requests_install_table() {
	global $wpdb;
	require_once ABSPATH . 'wp-admin/includes/upgrade.php';
	$table   = raouf_requests_table_name();
	$charset = $wpdb->get_charset_collate();
	$sql     = "CREATE TABLE {$table} (
		id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
		ref varchar(40) NOT NULL,
		kind varchar(20) NOT NULL,
		name varchar(191) NOT NULL DEFAULT '',
		phone varchar(40) NOT NULL DEFAULT '',
		course varchar(191) NOT NULL DEFAULT '',
		email varchar(191) NOT NULL DEFAULT '',
		subject varchar(191) NOT NULL DEFAULT '',
		message longtext NOT NULL,
		extra longtext NOT NULL,
		ip_hash varchar(64) NOT NULL DEFAULT '',
		dedupe_key varchar(64) NOT NULL DEFAULT '',
		source varchar(20) NOT NULL DEFAULT 'form',
		source_id bigint(20) unsigned NOT NULL DEFAULT 0,
		created_at datetime NOT NULL,
		created_at_gmt datetime NOT NULL,
		PRIMARY KEY  (id),
		UNIQUE KEY ref (ref),
		KEY kind (kind),
		KEY created_at_gmt (created_at_gmt),
		KEY created_at (created_at),
		KEY phone (phone),
		KEY name (name),
		KEY dedupe_key (dedupe_key),
		KEY source_id (source_id)
	) {$charset};";
	dbDelta( $sql );
}

function raouf_requests_activate() {
	raouf_requests_install_table();
	raouf_requests_migrate_legacy();
	update_option( 'raouf_requests_db_version', RAOUF_REQUESTS_DB_VERSION );
}

function raouf_requests_maybe_upgrade() {
	if ( get_option( 'raouf_requests_db_version' ) !== RAOUF_REQUESTS_DB_VERSION ) {
		raouf_requests_install_table();
		raouf_requests_migrate_legacy();
		update_option( 'raouf_requests_db_version', RAOUF_REQUESTS_DB_VERSION );
	}
}

function raouf_requests_course_label( $course_id ) {
	$labels = array(
		'skin-facial'           => 'دوره تخصصی آموزش پاکسازی و فیشیال پوست',
		'medical-emergency'     => 'دوره جامع فوریتهای پزشکی، کمکهای اولیه، تزریقات و بخیه',
		'pharmacy-technician'   => 'دوره آموزشی تکنسین داروخانه (نسخهخوانی)',
		'massage-relaxation'    => 'دوره جامع تخصصی ماساژ و ریلکسیشن',
	);
	return isset( $labels[ $course_id ] ) ? $labels[ $course_id ] : (string) $course_id;
}

function raouf_requests_kind_label( $kind ) {
	return 'registration' === $kind ? 'پیش‑ثبت‑نام دوره' : 'پیام تماس با ما';
}

/**
 * Idempotent import of the original theme-owned private CPT records.
 * The CPT posts are never deleted; they remain available for rollback.
 */
function raouf_requests_migrate_legacy() {
	global $wpdb;
	if ( ! raouf_requests_table_exists() ) {
		return 0;
	}
	$table  = raouf_requests_table_name();
	$legacy = get_posts(
		array(
			'post_type'        => 'raouf_submission',
			'post_status'      => array( 'private', 'publish', 'draft', 'pending', 'future' ),
			'numberposts'      => -1,
			'orderby'          => 'ID',
			'order'            => 'ASC',
			'suppress_filters' => true,
		)
	);
	$imported = 0;
	foreach ( $legacy as $post ) {
		$pid       = (int) $post->ID;
		$ref       = (string) get_post_meta( $pid, '_raouf_ref', true );
		if ( '' === $ref ) {
			$ref = sprintf( 'MIG-%06d', $pid );
		}
		$exists = $wpdb->get_var(
			$wpdb->prepare( "SELECT id FROM {$table} WHERE ref = %s OR source_id = %d LIMIT 1", $ref, $pid )
		);
		if ( $exists ) {
			continue;
		}

		$kind      = (string) get_post_meta( $pid, '_raouf_kind', true );
		$kind      = in_array( $kind, array( 'registration', 'contact' ), true ) ? $kind : 'contact';
		$course_id = (string) get_post_meta( $pid, '_raouf_course', true );
		$course    = raouf_requests_course_label( $course_id );
		$name      = (string) get_post_meta( $pid, '_raouf_name', true );
		$phone     = (string) get_post_meta( $pid, '_raouf_phone', true );
		$email     = (string) get_post_meta( $pid, '_raouf_email', true );
		$subject   = (string) get_post_meta( $pid, '_raouf_subject', true );
		$message   = (string) $post->post_content;
		$ip_hash   = (string) get_post_meta( $pid, '_raouf_ip', true );

		$extra = array(
			'source'       => 'legacy-cpt',
			'legacy_id'    => $pid,
			'legacy_title' => $post->post_title,
			'name'         => $name,
			'phone'        => $phone,
			'course_id'    => $course_id,
			'course_name'  => $course,
			'email'        => $email,
			'subject'      => $subject,
			'message'      => $message,
		);

		$gmt = (string) $post->post_date_gmt;
		if ( '' === $gmt || '0000-00-00 00:00:00' === $gmt ) {
			$gmt = current_time( 'mysql', true );
		}
		$local = (string) $post->post_date;
		if ( '' === $local || '0000-00-00 00:00:00' === $local ) {
			$local = wp_date( 'Y-m-d H:i:s', null, wp_timezone() );
		}

		$inserted = $wpdb->insert(
			$table,
			array(
				'ref'            => $ref,
				'kind'           => $kind,
				'name'           => $name,
				'phone'          => $phone,
				'course'         => $course,
				'email'          => $email,
				'subject'        => $subject,
				'message'        => $message,
				'extra'          => wp_json_encode( $extra, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ),
				'ip_hash'        => $ip_hash,
				'dedupe_key'     => md5( $kind . '|' . $phone . '|' . $course_id . '|' . $subject . '|legacy' ),
				'source'         => 'legacy-cpt',
				'source_id'      => $pid,
				'created_at'     => $local,
				'created_at_gmt' => $gmt,
			),
			array( '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%d', '%s', '%s' )
		);
		if ( false !== $inserted ) {
			update_post_meta( $pid, '_raouf_migrated_to_plugin', current_time( 'mysql', true ) );
			++$imported;
		}
	}
	return $imported;
}

function raouf_requests_local_parts( $row ) {
	$gmt = isset( $row->created_at_gmt ) ? (string) $row->created_at_gmt : '';
	$ts  = $gmt ? strtotime( $gmt . ' UTC' ) : false;
	if ( ! $ts ) {
		$ts = time();
	}
	$tz = wp_timezone();
	return array(
		'date' => wp_date( 'Y-m-d', $ts, $tz ),
		'time' => wp_date( 'H:i', $ts, $tz ),
		'full' => wp_date( 'Y-m-d H:i:s', $ts, $tz ),
	);
}

/**
 * Store one request. Returns a storage marker array ONLY after a successful
 * INSERT; returns WP_Error on duplicate or any database failure.
 */
function raouf_requests_store( $stored, $kind, $clean, $ref ) {
	if ( is_wp_error( $stored ) ) {
		return $stored;
	}
	if ( is_array( $stored ) ) {
		return $stored;
	}
	if ( ! in_array( $kind, array( 'registration', 'contact' ), true ) ) {
		return new WP_Error( 'raouf_requests_invalid_kind', 'نوع درخواست نامعتبر است.' );
	}
	if ( ! raouf_requests_table_exists() ) {
		return new WP_Error( 'raouf_requests_db_unavailable', 'ذخیره سازی اطلاعات انجام نشد. لطفاً دوباره تلاش کنید یا با آموزشگاه تماس بگیرید.' );
	}

	global $wpdb;
	$table     = raouf_requests_table_name();
	$name      = isset( $clean['name'] ) ? (string) $clean['name'] : '';
	$phone     = isset( $clean['phone'] ) ? (string) $clean['phone'] : '';
	$message   = isset( $clean['message'] ) ? (string) $clean['message'] : '';
	$course_id = 'registration' === $kind && isset( $clean['course'] ) ? (string) $clean['course'] : '';
	$course    = 'registration' === $kind ? raouf_requests_course_label( $course_id ) : '';
	$email     = 'contact' === $kind && isset( $clean['email'] ) ? (string) $clean['email'] : '';
	$subject   = 'contact' === $kind && isset( $clean['subject'] ) ? (string) $clean['subject'] : '';
	$ip_hash   = isset( $clean['ip_hash'] ) ? (string) $clean['ip_hash'] : '';

	$dedupe_key = md5( $kind . '|' . $phone . '|' . $course_id . '|' . $subject . '|' . $name );
	$since      = gmdate( 'Y-m-d H:i:s', time() - 10 * MINUTE_IN_SECONDS );
	$recent     = $wpdb->get_var(
		$wpdb->prepare(
			"SELECT ref FROM {$table} WHERE dedupe_key = %s AND created_at_gmt >= %s LIMIT 1",
			$dedupe_key,
			$since
		)
	);
	if ( $recent ) {
		return new WP_Error( 'raouf_requests_duplicate', 'این درخواست همین حالا ثبت شده است. لطفاً از ارسال مجدد خودداری کنید.' );
	}

	$extra = $clean;
	$extra['course_id']   = $course_id;
	$extra['course_name'] = $course;
	$extra['kind']        = $kind;
	$extra['ref']         = $ref;
	$json = wp_json_encode( $extra, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
	if ( false === $json ) {
		$json = '{}';
	}

	$gmt   = current_time( 'mysql', true );
	$local = wp_date( 'Y-m-d H:i:s', null, wp_timezone() );

	$inserted = $wpdb->insert(
		$table,
		array(
			'ref'            => $ref,
			'kind'           => $kind,
			'name'           => $name,
			'phone'          => $phone,
			'course'         => $course,
			'email'          => $email,
			'subject'        => $subject,
			'message'        => $message,
			'extra'          => $json,
			'ip_hash'        => $ip_hash,
			'dedupe_key'     => $dedupe_key,
			'source'         => 'form',
			'source_id'      => 0,
			'created_at'     => $local,
			'created_at_gmt' => $gmt,
		),
		array( '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%d', '%s', '%s' )
	);
	if ( false === $inserted ) {
		$detail = $wpdb->last_error ? ' (' . $wpdb->last_error . ')' : '';
		return new WP_Error( 'raouf_requests_insert_failed', 'ذخیره سازی اطلاعات انجام نشد. لطفاً دوباره تلاش کنید یا با آموزشگاه تماس بگیرید.' . $detail );
	}
	return array(
		'id'      => (int) $wpdb->insert_id,
		'ref'     => $ref,
		'storage' => 'plugin',
	);
}

function raouf_requests_query_rows( $args = array() ) {
	global $wpdb;
	$table = raouf_requests_table_name();
	if ( ! raouf_requests_table_exists() ) {
		return array();
	}
	$where  = array( '1=1' );
	$params = array();

	$type = isset( $args['type'] ) ? (string) $args['type'] : '';
	if ( in_array( $type, array( 'registration', 'contact' ), true ) ) {
		$where[]  = 'kind = %s';
		$params[] = $type;
	}
	$search = isset( $args['s'] ) ? trim( (string) $args['s'] ) : '';
	if ( '' !== $search ) {
		$like     = '%' . $wpdb->esc_like( $search ) . '%';
		$where[]  = '( name LIKE %s OR phone LIKE %s )';
		$params[] = $like;
		$params[] = $like;
	}
	$from = isset( $args['date_from'] ) ? (string) $args['date_from'] : '';
	$to   = isset( $args['date_to'] ) ? (string) $args['date_to'] : '';
	if ( preg_match( '/^\d{4}-\d{2}-\d{2}$/', $from ) ) {
		$where[]  = 'DATE(created_at) >= %s';
		$params[] = $from;
	}
	if ( preg_match( '/^\d{4}-\d{2}-\d{2}$/', $to ) ) {
		$where[]  = 'DATE(created_at) <= %s';
		$params[] = $to;
	}

	$sql = "SELECT * FROM {$table} WHERE " . implode( ' AND ', $where ) . ' ORDER BY created_at_gmt DESC, id DESC';
	$limit = isset( $args['limit'] ) ? (int) $args['limit'] : 200;
	if ( $limit > 0 ) {
		$sql     .= ' LIMIT %d';
		$params[] = $limit;
	}
	if ( $params ) {
		$sql = $wpdb->prepare( $sql, $params );
	}
	return $wpdb->get_results( $sql );
}

function raouf_requests_get_row( $id ) {
	global $wpdb;
	$table = raouf_requests_table_name();
	if ( ! raouf_requests_table_exists() ) {
		return null;
	}
	return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $id ) );
}

function raouf_requests_delete_row( $id ) {
	global $wpdb;
	$table = raouf_requests_table_name();
	if ( ! raouf_requests_table_exists() ) {
		return false;
	}
	return false !== $wpdb->delete( $table, array( 'id' => $id ), array( '%d' ) );
}
