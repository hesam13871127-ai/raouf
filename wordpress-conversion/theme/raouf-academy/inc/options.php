<?php
/**
 * Theme settings: official contact data + Media Library image overrides.
 * Also a read-only list of real form submissions.
 *
 * @package Raouf_Academy
 */

defined( 'ABSPATH' ) || exit;

function raouf_option_fields() {
	return array(
		'site_name'      => array( 'نام آموزشگاه', 'text' ),
		'phone_display'  => array( 'شماره تماس (نمایش)', 'text' ),
		'phone_tel'      => array( 'شماره تماس (لینک tel)', 'text' ),
		'address'        => array( 'نشانی', 'textarea' ),
		'instagram_user' => array( 'نام کاربری اینستاگرام', 'text' ),
		'instagram_url'  => array( 'نشانی صفحه اینستاگرام', 'url' ),
		'map_url'        => array( 'لینک جستجوی آدرس روی نقشه', 'url' ),
		'footer_intro'   => array( 'متن معرفی فوتی', 'textarea' ),
		'admin_email'    => array( 'رایانامه دریافت درخواست‌ها (اختیاری)', 'email' ),
	);
}

function raouf_replaceable_images() {
	return array(
		'assets/images/raouf-logo.jpg'       => 'لوگوی رسمی',
		'assets/images/hero-academy.webp'    => 'تصویر هیرو صفحه اصلی',
		'assets/images/course-facial.webp'   => 'دوره پاکسازی و فیشیال پوست',
		'assets/images/first-aid-01.webp'    => 'دوره فوریت‌های پزشکی',
		'assets/images/course-pharmacy.webp' => 'دوره تکنسین داروخانه',
		'assets/images/course-massage.webp'  => 'دوره ماساژ و ریلکسیشن',
	);
}

function raouf_sanitize_options( $input ) {
	$out = array();
	foreach ( raouf_option_fields() as $key => $definition ) {
		$value = isset( $input[ $key ] ) ? wp_unslash( $input[ $key ] ) : '';
		if ( 'url' === $definition[1] ) {
			$out[ $key ] = esc_url_raw( $value );
		} elseif ( 'email' === $definition[1] ) {
			$out[ $key ] = sanitize_email( $value );
		} elseif ( 'textarea' === $definition[1] ) {
			$out[ $key ] = sanitize_textarea_field( $value );
		} else {
			$out[ $key ] = sanitize_text_field( $value );
		}
	}
	return $out;
}

function raouf_sanitize_media( $input ) {
	$out = array();
	if ( ! is_array( $input ) ) {
		return $out;
	}
	foreach ( raouf_replaceable_images() as $path => $label ) {
		if ( ! empty( $input[ $path ] ) ) {
			$id = absint( $input[ $path ] );
			if ( $id && 'attachment' === get_post_type( $id ) ) {
				$out[ $path ] = $id;
			}
		}
	}
	return $out;
}

add_action(
	'admin_init',
	static function () {
		/*
		 * Both options are arrays. Declaring the real type/default keeps the
		 * registered-settings metadata accurate for WordPress and for any
		 * plugin reading $wp_registered_settings (Stage D defect SD-04).
		 * show_in_rest stays false: these values never belong in the REST API.
		 */
		$common = array(
			'type'         => 'array',
			'default'      => array(),
			'show_in_rest' => false,
		);
		register_setting( 'raouf_options_group', 'raouf_options', array_merge( $common, array( 'sanitize_callback' => 'raouf_sanitize_options' ) ) );
		register_setting( 'raouf_options_group', 'raouf_media', array_merge( $common, array( 'sanitize_callback' => 'raouf_sanitize_media' ) ) );
	}
);

add_action(
	'admin_menu',
	static function () {
		add_theme_page(
			__( 'تنظیمات قالب رئوف', 'raouf-academy' ),
			__( 'تنظیمات قالب رئوف', 'raouf-academy' ),
			'manage_options',
			'raouf-options',
			'raouf_options_page'
		);
		add_theme_page(
			__( 'درخواست‌های ثبت شده', 'raouf-academy' ),
			__( 'درخواست‌های ثبت شده', 'raouf-academy' ),
			'manage_options',
			'raouf-submissions',
			'raouf_submissions_page'
		);
	}
);

/**
 * The submission post type is intentionally hidden from the standard
 * posts UI (show_ui = false). WP core answers a direct edit.php URL with
 * a generic 500, so send administrators to the real management screen
 * and deny everybody else. Also tolerate the wrong-parent URL.
 */
add_action(
	'admin_init',
	static function () {
		global $pagenow;
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only routing.
		$page       = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : '';
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only routing.
		$post_type  = isset( $_GET['post_type'] ) ? sanitize_key( wp_unslash( $_GET['post_type'] ) ) : '';
		$is_cpt_url = 'edit.php' === $pagenow && 'raouf_submission' === $post_type;
		$is_alt_url = 'tools.php' === $pagenow && 'raouf-submissions' === $page;
		if ( ! $is_cpt_url && ! $is_alt_url ) {
			return;
		}
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'دسترسی غیرمجاز', 'raouf-academy' ), '', array( 'response' => 403 ) );
		}
		wp_safe_redirect( admin_url( 'themes.php?page=raouf-submissions' ) );
		exit;
	}
);

add_action(
	'admin_enqueue_scripts',
	static function ( $hook ) {
		if ( 'appearance_page_raouf-options' !== $hook ) {
			return;
		}
		wp_enqueue_media();
	}
);

function raouf_options_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$options = raouf_options();
	$media   = get_option( 'raouf_media', array() );
	?>
	<div class="wrap" dir="rtl">
		<h1><?php echo esc_html__( 'تنظیمات قالب رئوف', 'raouf-academy' ); ?></h1>
		<p><?php echo esc_html__( 'مقادیر پیش فرض دقیقاً همان اطلاعات رسمی سایت منبع هستند. تغییر آنها فقط متن مربوطه را در هدر و فوتی به‌روزرسانی می‌کند و ظاهر قالب تغییر نمی کند.', 'raouf-academy' ); ?></p>
		<form method="post" action="options.php">
			<?php settings_fields( 'raouf_options_group' ); ?>
			<h2><?php echo esc_html__( 'اطلاعات رسمی', 'raouf-academy' ); ?></h2>
			<table class="form-table" role="presentation">
				<?php foreach ( raouf_option_fields() as $key => $definition ) : ?>
					<tr>
						<th scope="row"><label for="raouf_<?php echo esc_attr( $key ); ?>"><?php echo esc_html( $definition[0] ); ?></label></th>
						<td>
							<?php if ( 'textarea' === $definition[1] ) : ?>
								<textarea id="raouf_<?php echo esc_attr( $key ); ?>" name="raouf_options[<?php echo esc_attr( $key ); ?>]" rows="3" class="large-text"><?php echo esc_textarea( $options[ $key ] ); ?></textarea>
							<?php else : ?>
								<input id="raouf_<?php echo esc_attr( $key ); ?>" name="raouf_options[<?php echo esc_attr( $key ); ?>]" type="<?php echo esc_attr( 'url' === $definition[1] ? 'url' : ( 'email' === $definition[1] ? 'email' : 'text' ) ); ?>" value="<?php echo esc_attr( $options[ $key ] ); ?>" class="regular-text" dir="auto">
							<?php endif; ?>
						</td>
					</tr>
				<?php endforeach; ?>
			</table>

			<h2><?php echo esc_html__( 'تصاویر قابل مدیریت (کتابخانه رسانه)', 'raouf-academy' ); ?></h2>
			<p><?php echo esc_html__( 'در صورت انتخاب تصویر، نشانی همان تصویر جایگزین فایل اصلی قالب می شود. در غیر این صورت همان فایل اصلی منبع بارگذاری می شود.', 'raouf-academy' ); ?></p>
			<table class="form-table" role="presentation">
				<?php foreach ( raouf_replaceable_images() as $path => $label ) : ?>
					<?php $id = isset( $media[ $path ] ) ? absint( $media[ $path ] ) : 0; ?>
					<tr>
						<th scope="row"><?php echo esc_html( $label ); ?></th>
						<td>
							<div class="raouf-media-row" data-path="<?php echo esc_attr( $path ); ?>">
								<img class="raouf-media-preview" src="<?php echo esc_url( $id ? wp_get_attachment_url( $id ) : raouf_asset_url( $path ) ); ?>" alt="" style="max-width:110px;max-height:80px;display:block;margin-bottom:8px;">
								<input class="raouf-media-id" type="hidden" name="raouf_media[<?php echo esc_attr( $path ); ?>]" value="<?php echo esc_attr( $id ? $id : '' ); ?>">
								<button type="button" class="button raouf-media-pick"><?php echo esc_html__( 'انتخاب تصویر', 'raouf-academy' ); ?></button>
								<button type="button" class="button raouf-media-clear"><?php echo esc_html__( 'استفاده از تصویر اصلی', 'raouf-academy' ); ?></button>
							</div>
						</td>
					</tr>
				<?php endforeach; ?>
			</table>
			<?php submit_button( __( 'ذخیره تنظیمات', 'raouf-academy' ) ); ?>
		</form>

		<hr>
		<h2><?php echo esc_html__( 'بازسازی صفحات اولیه', 'raouf-academy' ); ?></h2>
		<p><?php echo esc_html__( 'اگر نشانی سایت تغییر کرده یا صفحات ویرایش شده اند، می توانید محتوای دقیق منبع را دوباره در صفحات وردپرس قرار دهید.', 'raouf-academy' ); ?></p>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="raouf_resync_pages">
			<?php wp_nonce_field( 'raouf_resync_pages' ); ?>
			<?php submit_button( __( 'بازسازی صفحات قالب', 'raouf-academy' ), 'secondary', 'submit', false ); ?>
		</form>
	</div>
	<script>
	(function ($) {
		$('.raouf-media-pick').on('click', function () {
			var row = $(this).closest('.raouf-media-row');
			var frame = wp.media({ title: 'انتخاب تصویر', button: { text: 'استفاده از تصویر' }, multiple: false });
			frame.on('select', function () {
				var a = frame.state().get('selection').first().toJSON();
				row.find('.raouf-media-id').val(a.id);
				row.find('.raouf-media-preview').attr('src', a.url);
			});
			frame.open();
		});
		$('.raouf-media-clear').on('click', function () {
			$(this).closest('.raouf-media-row').find('.raouf-media-id').val('');
		});
	})(jQuery);
	</script>
	<?php
}

/**
 * Administrators can open an individual submission. The link carries a
 * per-record nonce and the handler re-checks capability, post type and status
 * so private form data is never reachable by unauthorised users (defect D05).
 */
function raouf_submission_view_url( $id ) {
	$id = absint( $id );
	return add_query_arg(
		array(
			'page'       => 'raouf-submissions',
			'raouf_view' => $id,
			'_wpnonce'   => wp_create_nonce( 'raouf_view_submission_' . $id ),
		),
		admin_url( 'themes.php' )
	);
}

function raouf_submissions_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'دسترسی غیرمجاز', 'raouf-academy' ), '', array( 'response' => 403 ) );
	}

	/* ---------------------------------------------------------- detail view */
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- verified immediately below.
	$view_id = isset( $_GET['raouf_view'] ) ? absint( $_GET['raouf_view'] ) : 0;
	if ( $view_id ) {
		$nonce = isset( $_GET['_wpnonce'] ) ? sanitize_text_field( wp_unslash( $_GET['_wpnonce'] ) ) : '';
		if ( ! wp_verify_nonce( $nonce, 'raouf_view_submission_' . $view_id ) ) {
			wp_die( esc_html__( 'نشست نامعتبر است.', 'raouf-academy' ), '', array( 'response' => 403 ) );
		}
		$submission = get_post( $view_id );
		if ( ! ( $submission instanceof WP_Post ) || 'raouf_submission' !== $submission->post_type || 'private' !== $submission->post_status ) {
			wp_die( esc_html__( 'درخواست مورد نظر یافت نشد.', 'raouf-academy' ), '', array( 'response' => 404 ) );
		}
		$meta = array(
			'name'    => get_post_meta( $view_id, '_raouf_name', true ),
			'phone'   => get_post_meta( $view_id, '_raouf_phone', true ),
			'email'   => get_post_meta( $view_id, '_raouf_email', true ),
			'subject' => get_post_meta( $view_id, '_raouf_subject', true ),
			'course'  => get_post_meta( $view_id, '_raouf_course', true ),
			'ref'     => get_post_meta( $view_id, '_raouf_ref', true ),
			'kind'    => get_post_meta( $view_id, '_raouf_kind', true ),
			'ip'      => get_post_meta( $view_id, '_raouf_ip', true ),
		);
		?>
		<div class="wrap" dir="rtl">
			<h1><?php echo esc_html__( 'جزئیات درخواست', 'raouf-academy' ); ?></h1>
			<p><a href="<?php echo esc_url( admin_url( 'themes.php?page=raouf-submissions' ) ); ?>">&larr; <?php echo esc_html__( 'بازگشت به فهرست درخواستها', 'raouf-academy' ); ?></a></p>
			<table class="widefat striped" style="max-width:900px">
				<tbody>
					<tr><th style="width:190px"><?php echo esc_html__( 'شماره پیگیری', 'raouf-academy' ); ?></th><td dir="ltr"><?php echo esc_html( $meta['ref'] ); ?></td></tr>
					<tr><th><?php echo esc_html__( 'نوع درخواست', 'raouf-academy' ); ?></th><td><?php echo esc_html( 'registration' === $meta['kind'] ? 'ثبت نام' : 'تماس با ما' ); ?></td></tr>
					<tr><th><?php echo esc_html__( 'تاریخ ثبت', 'raouf-academy' ); ?></th><td dir="ltr"><?php echo esc_html( get_the_date( 'Y-m-d H:i', $submission ) ); ?></td></tr>
					<tr><th><?php echo esc_html__( 'نام و نام خانوادگی', 'raouf-academy' ); ?></th><td><?php echo esc_html( $meta['name'] ); ?></td></tr>
					<tr><th><?php echo esc_html__( 'شماره تماس', 'raouf-academy' ); ?></th><td dir="ltr"><?php echo esc_html( $meta['phone'] ); ?></td></tr>
					<tr><th><?php echo esc_html__( 'رایانامه', 'raouf-academy' ); ?></th><td dir="ltr"><?php echo esc_html( $meta['email'] ? $meta['email'] : '—' ); ?></td></tr>
					<tr><th><?php echo esc_html__( 'دوره / موضوع', 'raouf-academy' ); ?></th><td><?php echo esc_html( $meta['course'] ? $meta['course'] : $meta['subject'] ); ?></td></tr>
					<tr><th><?php echo esc_html__( 'متن پیام', 'raouf-academy' ); ?></th><td><?php echo nl2br( esc_html( $submission->post_content ) ); // phpcs:ignore WordPress.Security.EscapeOutput ?></td></tr>
					<tr><th><?php echo esc_html__( 'شناسه ناشناس IP (درهمشده)', 'raouf-academy' ); ?></th><td dir="ltr"><?php echo esc_html( $meta['ip'] ); ?></td></tr>
				</tbody>
			</table>
		</div>
		<?php
		return;
	}

	/* ----------------------------------------------------------- list view */
	$query = new WP_Query(
		array(
			'post_type'      => 'raouf_submission',
			'post_status'    => 'private',
			'posts_per_page' => 100,
			'orderby'        => 'date',
			'order'          => 'DESC',
		)
	);
	?>
	<div class="wrap" dir="rtl">
		<h1><?php echo esc_html__( 'درخواستهای ثبت شده', 'raouf-academy' ); ?></h1>
		<p><?php echo esc_html__( 'این رکوردها توسط فرمهای واقعی وبسایت ایجاد شدهاند؛ هیچ رکورد نمونه یا ساختگی ایجاد نمیشود.', 'raouf-academy' ); ?></p>
		<table class="widefat striped">
			<thead><tr>
				<th><?php echo esc_html__( 'شماره پیگیری', 'raouf-academy' ); ?></th>
				<th><?php echo esc_html__( 'نوع', 'raouf-academy' ); ?></th>
				<th><?php echo esc_html__( 'نام', 'raouf-academy' ); ?></th>
				<th><?php echo esc_html__( 'تماس', 'raouf-academy' ); ?></th>
				<th><?php echo esc_html__( 'رایانامه', 'raouf-academy' ); ?></th>
				<th><?php echo esc_html__( 'دوره / موضوع', 'raouf-academy' ); ?></th>
				<th><?php echo esc_html__( 'تاریخ', 'raouf-academy' ); ?></th>
				<th><?php echo esc_html__( 'جزئیات', 'raouf-academy' ); ?></th>
			</tr></thead>
			<tbody>
			<?php if ( $query->have_posts() ) : ?>
				<?php
				while ( $query->have_posts() ) :
					$query->the_post();
					$id = get_the_ID();
					?>
					<tr>
						<td dir="ltr"><?php echo esc_html( get_post_meta( $id, '_raouf_ref', true ) ); ?></td>
						<td><?php echo esc_html( 'registration' === get_post_meta( $id, '_raouf_kind', true ) ? 'ثبت نام' : 'تماس' ); ?></td>
						<td><?php echo esc_html( get_post_meta( $id, '_raouf_name', true ) ); ?></td>
						<td dir="ltr"><?php echo esc_html( get_post_meta( $id, '_raouf_phone', true ) ); ?></td>
						<td dir="ltr"><?php echo esc_html( get_post_meta( $id, '_raouf_email', true ) ? get_post_meta( $id, '_raouf_email', true ) : '—' ); ?></td>
						<td><?php echo esc_html( get_post_meta( $id, '_raouf_course', true ) ? get_post_meta( $id, '_raouf_course', true ) : get_post_meta( $id, '_raouf_subject', true ) ); ?></td>
						<td dir="ltr"><?php echo esc_html( get_the_date( 'Y-m-d H:i' ) ); ?></td>
						<td><a href="<?php echo esc_url( raouf_submission_view_url( $id ) ); ?>"><?php echo esc_html__( 'مشاهده کامل', 'raouf-academy' ); ?></a></td>
					</tr>
				<?php endwhile; ?>
				<?php wp_reset_postdata(); ?>
			<?php else : ?>
				<tr><td colspan="8"><?php echo esc_html__( 'هنوز درخواستی ثبت نشده است.', 'raouf-academy' ); ?></td></tr>
			<?php endif; ?>
			</tbody>
		</table>
	</div>
	<?php
}
