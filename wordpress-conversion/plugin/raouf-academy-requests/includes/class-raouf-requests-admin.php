<?php
/**
 * Independent WordPress administration for Raouf Academy requests.
 *
 * @package Raouf_Academy_Requests
 */

defined( 'ABSPATH' ) || exit;

function raouf_requests_admin_deny() {
	status_header( 403 );
	wp_die( esc_html__( 'دسترسی غیرمجاز', 'raouf-academy-requests' ), '', array( 'response' => 403 ) );
}

add_action(
	'admin_menu',
	static function () {
		$cap  = 'manage_options';
		$icon = 'dashicons-list-alt';
		add_menu_page(
			'درخواست‌های آموزشگاه رئوف',
			'درخواست‌های آموزشگاه رئوف',
			$cap,
			'raouf-requests',
			'raouf_requests_admin_page',
			$icon,
			26
		);
		add_submenu_page( 'raouf-requests', 'همه درخواست‌ها', 'همه درخواست‌ها', $cap, 'raouf-requests', 'raouf_requests_admin_page' );
		add_submenu_page( 'raouf-requests', 'پیش‑ثبت‑نام دوره‌ها', 'پیش‑ثبت‑نام دوره‌ها', $cap, 'raouf-requests-registrations', 'raouf_requests_admin_page' );
		add_submenu_page( 'raouf-requests', 'پیام‌های تماس با ما', 'پیام‌های تماس با ما', $cap, 'raouf-requests-contact', 'raouf_requests_admin_page' );
	}
);

function raouf_requests_admin_page_slug() {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only routing.
	$page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : 'raouf-requests';
	return in_array( $page, array( 'raouf-requests', 'raouf-requests-registrations', 'raouf-requests-contact' ), true ) ? $page : 'raouf-requests';
}

function raouf_requests_admin_title( $page ) {
	if ( 'raouf-requests-registrations' === $page ) {
		return 'پیش‑ثبت‑نام دوره‌ها';
	}
	if ( 'raouf-requests-contact' === $page ) {
		return 'پیام‌های تماس با ما';
	}
	return 'همه درخواست‌ها';
}

function raouf_requests_admin_args( $page ) {
	if ( 'raouf-requests-registrations' === $page ) {
		$type = 'registration';
	} elseif ( 'raouf-requests-contact' === $page ) {
		$type = 'contact';
	} else {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only filter.
		$raw  = isset( $_GET['type'] ) ? sanitize_key( wp_unslash( $_GET['type'] ) ) : '';
		$type = in_array( $raw, array( 'registration', 'contact' ), true ) ? $raw : '';
	}
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only search.
	$s = isset( $_GET['s'] ) ? sanitize_text_field( wp_unslash( $_GET['s'] ) ) : '';
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only filter.
	$from = isset( $_GET['date_from'] ) ? sanitize_text_field( wp_unslash( $_GET['date_from'] ) ) : '';
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only filter.
	$to = isset( $_GET['date_to'] ) ? sanitize_text_field( wp_unslash( $_GET['date_to'] ) ) : '';
	return array(
		'type'      => $type,
		's'         => $s,
		'date_from' => preg_match( '/^\d{4}-\d{2}-\d{2}$/', $from ) ? $from : '',
		'date_to'   => preg_match( '/^\d{4}-\d{2}-\d{2}$/', $to ) ? $to : '',
	);
}

function raouf_requests_admin_base_url( $page ) {
	return add_query_arg( 'page', $page, admin_url( 'admin.php' ) );
}

function raouf_requests_csv_cell( $value ) {
	$value = (string) $value;
	if ( '' !== $value && in_array( $value[0], array( '=', '+', '-', '@' ), true ) ) {
		$value = "'" . $value;
	}
	return $value;
}

/**
 * RFC 4180 CSV row. PHP's fputcsv() escapes embedded quotes with a backslash,
 * which many CSV readers (including Python/Excel) do not parse consistently.
 * Doubling quotes keeps every record at exactly 13 columns.
 */
function raouf_requests_csv_row( $fields ) {
	$cells = array();
	foreach ( $fields as $field ) {
		$field = (string) $field;
		if ( false !== strpbrk( $field, ",\"\r\n" ) ) {
			$cells[] = '"' . str_replace( '"', '""', $field ) . '"';
		} else {
			$cells[] = $field;
		}
	}
	return implode( ',', $cells ) . "\r\n";
}

function raouf_requests_admin_export( $args ) {
	check_admin_referer( 'raouf_export_requests' );
	$rows = raouf_requests_query_rows( array_merge( $args, array( 'limit' => 0 ) ) );
	nocache_headers();
	status_header( 200 );
	header( 'Content-Type: text/csv; charset=UTF-8' );
	header( 'X-Content-Type-Options: nosniff' );
	$stamp = wp_date( 'Ymd-His', null, wp_timezone() );
	header( 'Content-Disposition: attachment; filename="raouf-requests-' . $stamp . '.csv"' );

	$out = fopen( 'php://output', 'w' );
	fwrite( $out, "\xEF\xBB\xBF" );
	fwrite(
		$out,
		raouf_requests_csv_row(
			array(
				'شماره پیگیری', 'نوع درخواست', 'نام و نام خانوادگی', 'شماره تماس',
				'نام دوره', 'رایانامه', 'موضوع', 'متن پیام / توضیحات', 'سایر فیلدها',
				'تاریخ', 'زمان', 'منبع', 'IP درهمشده',
			)
		)
	);
	foreach ( $rows as $row ) {
		$parts = raouf_requests_local_parts( $row );
		fwrite(
			$out,
			raouf_requests_csv_row(
				array(
				raouf_requests_csv_cell( $row->ref ),
				raouf_requests_csv_cell( raouf_requests_kind_label( $row->kind ) ),
				raouf_requests_csv_cell( $row->name ),
				raouf_requests_csv_cell( $row->phone ),
				raouf_requests_csv_cell( $row->course ),
				raouf_requests_csv_cell( $row->email ),
				raouf_requests_csv_cell( $row->subject ),
				raouf_requests_csv_cell( $row->message ),
				raouf_requests_csv_cell( $row->extra ),
				raouf_requests_csv_cell( $parts['date'] ),
				raouf_requests_csv_cell( $parts['time'] ),
				raouf_requests_csv_cell( $row->source ),
				raouf_requests_csv_cell( $row->ip_hash ),
			)
		));
	}
	fclose( $out );
	exit;
}

function raouf_requests_admin_render_detail( $row, $page ) {
	$parts  = raouf_requests_local_parts( $row );
	$extra  = json_decode( (string) $row->extra, true );
	$pretty = is_array( $extra )
		? wp_json_encode( $extra, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES )
		: (string) $row->extra;
	?>
	<div class="wrap" dir="rtl">
		<h1>جزئیات درخواست</h1>
		<p><a href="<?php echo esc_url( raouf_requests_admin_base_url( $page ) ); ?>">&larr; بازگشت به فهرست</a></p>
		<table class="widefat striped" style="max-width:980px">
			<tbody>
				<tr><th style="width:190px">شماره پیگیری</th><td dir="ltr"><?php echo esc_html( $row->ref ); ?></td></tr>
				<tr><th>نوع درخواست</th><td><?php echo esc_html( raouf_requests_kind_label( $row->kind ) ); ?></td></tr>
				<tr><th>نام و نام خانوادگی</th><td><?php echo esc_html( $row->name ); ?></td></tr>
				<tr><th>شماره تماس</th><td dir="ltr"><?php echo esc_html( $row->phone ); ?></td></tr>
				<tr><th>نام دوره</th><td><?php echo esc_html( $row->course ? $row->course : '—' ); ?></td></tr>
				<tr><th>رایانامه</th><td dir="ltr"><?php echo esc_html( $row->email ? $row->email : '—' ); ?></td></tr>
				<tr><th>موضوع</th><td><?php echo esc_html( $row->subject ? $row->subject : '—' ); ?></td></tr>
				<tr><th>متن پیام / توضیحات</th><td><?php echo nl2br( esc_html( $row->message ) ); // phpcs:ignore WordPress.Security.EscapeOutput ?></td></tr>
				<tr><th>همه فیلدهای دیگر</th><td><pre dir="ltr" style="white-space:pre-wrap;max-width:760px"><?php echo esc_html( $pretty ); ?></pre></td></tr>
				<tr><th>تاریخ (زمان محلی وردپرس)</th><td dir="ltr"><?php echo esc_html( $parts['date'] ); ?></td></tr>
				<tr><th>زمان (زمان محلی وردپرس)</th><td dir="ltr"><?php echo esc_html( $parts['time'] ); ?></td></tr>
				<tr><th>تاریخ و زمان کامل</th><td dir="ltr"><?php echo esc_html( $parts['full'] ); ?></td></tr>
				<tr><th>منبع</th><td><?php echo esc_html( $row->source ); ?></td></tr>
				<tr><th>IP درهمشده</th><td dir="ltr"><?php echo esc_html( $row->ip_hash ); ?></td></tr>
			</tbody>
		</table>
	</div>
	<?php
}

/**
 * CSV / delete must run on admin_init: WordPress prints admin-header.php
 * before the page callback, and headers/redirects must happen before that.
 */
function raouf_requests_admin_early_actions() {
	global $pagenow;
	if ( 'admin.php' !== $pagenow ) {
		return;
	}
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- verified per action below.
	$page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : '';
	if ( ! in_array( $page, array( 'raouf-requests', 'raouf-requests-registrations', 'raouf-requests-contact' ), true ) ) {
		return;
	}
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- verified per action below.
	$action = isset( $_GET['action'] ) ? sanitize_key( wp_unslash( $_GET['action'] ) ) : '';
	if ( ! in_array( $action, array( 'export', 'delete' ), true ) ) {
		return;
	}
	if ( ! current_user_can( 'manage_options' ) ) {
		raouf_requests_admin_deny();
	}
	$args = raouf_requests_admin_args( $page );
	if ( 'export' === $action ) {
		raouf_requests_admin_export( $args );
	}
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- nonce checked immediately below.
	$request = isset( $_GET['request'] ) ? absint( wp_unslash( $_GET['request'] ) ) : 0;
	if ( 'delete' === $action && $request ) {
		check_admin_referer( 'raouf_delete_request_' . $request );
		raouf_requests_delete_row( $request );
		wp_safe_redirect( add_query_arg( 'deleted', '1', raouf_requests_admin_base_url( $page ) ) );
		exit;
	}
}
add_action( 'admin_init', 'raouf_requests_admin_early_actions' );

function raouf_requests_admin_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		raouf_requests_admin_deny();
	}
	$page = raouf_requests_admin_page_slug();
	$args = raouf_requests_admin_args( $page );
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- verified below.
	$action = isset( $_GET['action'] ) ? sanitize_key( wp_unslash( $_GET['action'] ) ) : '';
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- verified below.
	$request = isset( $_GET['request'] ) ? absint( wp_unslash( $_GET['request'] ) ) : 0;

	if ( 'view' === $action && $request ) {
		check_admin_referer( 'raouf_view_request_' . $request );
		$row = raouf_requests_get_row( $request );
		if ( ! $row ) {
			wp_die( esc_html__( 'درخواست مورد نظر یافت نشد.', 'raouf-academy-requests' ), '', array( 'response' => 404 ) );
		}
		raouf_requests_admin_render_detail( $row, $page );
		return;
	}

	$rows  = raouf_requests_query_rows( array_merge( $args, array( 'limit' => 200 ) ) );
	$total = count( raouf_requests_query_rows( array_merge( $args, array( 'limit' => 0 ) ) ) );
	$export_args = array(
		'page'      => $page,
		'action'    => 'export',
		's'         => $args['s'],
		'type'      => $args['type'],
		'date_from' => $args['date_from'],
		'date_to'   => $args['date_to'],
	);
	$export_url = wp_nonce_url( add_query_arg( $export_args, admin_url( 'admin.php' ) ), 'raouf_export_requests' );
	?>
	<div class="wrap" dir="rtl">
		<h1><?php echo esc_html( raouf_requests_admin_title( $page ) ); ?></h1>
		<p>رکوردها در جدول اختصاصی پایگاه داده وردپرس ذخیره میشوند و پس از خروج، بستن مرورگر یا تغییر قالب باقی میمانند. فهرست از جدیدترین به قدیمیترین مرتب شده است.</p>
		<?php if ( isset( $_GET['deleted'] ) ) : // phpcs:ignore WordPress.Security.NonceVerification.Recommended ?>
			<div class="notice notice-success"><p>درخواست حذف شد.</p></div>
		<?php endif; ?>

		<form method="get" action="<?php echo esc_url( admin_url( 'admin.php' ) ); ?>" style="margin:14px 0;padding:12px;background:#fff;border:1px solid #dcdcde">
			<input type="hidden" name="page" value="<?php echo esc_attr( $page ); ?>">
			<?php if ( 'raouf-requests' === $page ) : ?>
				<label>نوع درخواست:
					<select name="type">
						<option value="" <?php selected( '', $args['type'] ); ?>>همه انواع</option>
						<option value="registration" <?php selected( 'registration', $args['type'] ); ?>>پیش‑ثبت‑نام دوره‌ها</option>
						<option value="contact" <?php selected( 'contact', $args['type'] ); ?>>پیام‌های تماس با ما</option>
					</select>
				</label>
			<?php else : ?>
				<input type="hidden" name="type" value="<?php echo esc_attr( $args['type'] ); ?>">
			<?php endif; ?>
			<label>جستجو (نام یا شماره تماس):
				<input type="search" name="s" value="<?php echo esc_attr( $args['s'] ); ?>" style="min-width:220px">
			</label>
			<label>از تاریخ:
				<input type="date" name="date_from" value="<?php echo esc_attr( $args['date_from'] ); ?>">
			</label>
			<label>تا تاریخ:
				<input type="date" name="date_to" value="<?php echo esc_attr( $args['date_to'] ); ?>">
			</label>
			<button type="submit" class="button button-primary">اعمال فیلتر</button>
			<a class="button" href="<?php echo esc_url( raouf_requests_admin_base_url( $page ) ); ?>">پاک کردن فیلترها</a>
			<a class="button" href="<?php echo esc_url( $export_url ); ?>">خروجی CSV</a>
		</form>

		<p>تعداد رکوردهای منطبق: <strong><?php echo esc_html( (string) $total ); ?></strong><?php echo count( $rows ) < $total ? ' (نمایش ۲۰۰ رکورد اخیر)' : ''; ?></p>
		<table class="widefat striped">
			<thead><tr>
				<th>شماره پیگیری</th><th>نوع</th><th>نام و نام خانوادگی</th><th>شماره تماس</th>
				<th>دوره / موضوع</th><th>تاریخ</th><th>زمان</th><th>عملیات</th>
			</tr></thead>
			<tbody>
			<?php if ( $rows ) : ?>
				<?php foreach ( $rows as $row ) : ?>
					<?php
					$parts      = raouf_requests_local_parts( $row );
					$view_url   = wp_nonce_url( add_query_arg( array( 'page' => $page, 'action' => 'view', 'request' => (int) $row->id ), admin_url( 'admin.php' ) ), 'raouf_view_request_' . (int) $row->id );
					$delete_url = wp_nonce_url( add_query_arg( array( 'page' => $page, 'action' => 'delete', 'request' => (int) $row->id ), admin_url( 'admin.php' ) ), 'raouf_delete_request_' . (int) $row->id );
					?>
					<tr>
						<td dir="ltr"><?php echo esc_html( $row->ref ); ?></td>
						<td><?php echo esc_html( raouf_requests_kind_label( $row->kind ) ); ?></td>
						<td><?php echo esc_html( $row->name ); ?></td>
						<td dir="ltr"><?php echo esc_html( $row->phone ); ?></td>
						<td><?php echo esc_html( $row->course ? $row->course : $row->subject ); ?></td>
						<td dir="ltr"><?php echo esc_html( $parts['date'] ); ?></td>
						<td dir="ltr"><?php echo esc_html( $parts['time'] ); ?></td>
						<td>
							<a href="<?php echo esc_url( $view_url ); ?>">مشاهده کامل</a>
							&nbsp;|&nbsp;
							<a href="<?php echo esc_url( $delete_url ); ?>" onclick="return confirm('<?php echo esc_js( 'آیا از حذف این درخواست اطمینان دارید؟ این عمل قابل بازگشت نیست.' ); ?>');" style="color:#b32d2e">حذف</a>
						</td>
					</tr>
				<?php endforeach; ?>
			<?php else : ?>
				<tr><td colspan="8">هیچ درخواستی با این شرایط یافت نشد.</td></tr>
			<?php endif; ?>
			</tbody>
		</table>
	</div>
	<?php
}
