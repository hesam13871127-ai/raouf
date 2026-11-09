<?php
/**
 * Real WordPress backend for the two original forms.
 *
 * The original assets/js/app.js is loaded verbatim: it POSTs to
 * /api/registrations and /api/contact, sends a double-submit CSRF token and a
 * honeypot field. This file implements those endpoints with WordPress nonces,
 * sanitisation and real persistence (private custom post type).
 *
 * @package Raouf_Academy
 */

defined( 'ABSPATH' ) || exit;

define( 'RAOUF_FORM_ACTION', 'raouf_forms' );

function raouf_valid_course_ids() {
	return array( 'skin-facial', 'medical-emergency', 'pharmacy-technician', 'massage-relaxation' );
}

/** Issue the CSRF cookie expected by the untouched front-end script. */
add_action(
	'init',
	static function () {
		if ( is_admin() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
			return;
		}
		$token = isset( $_COOKIE['raouf_csrf'] ) ? sanitize_text_field( wp_unslash( $_COOKIE['raouf_csrf'] ) ) : '';
		if ( $token && wp_verify_nonce( $token, RAOUF_FORM_ACTION ) ) {
			return;
		}
		$token = wp_create_nonce( RAOUF_FORM_ACTION );
		if ( ! headers_sent() ) {
			// phpcs:ignore WordPressVIPMinimum.Functions.RestrictedFunctions.cookies_setcookie
			setcookie(
				'raouf_csrf',
				$token,
				array(
					'expires'  => time() + DAY_IN_SECONDS,
					'path'     => '/',
					'samesite' => 'Strict',
					'secure'   => is_ssl(),
					'httponly' => false,
				)
			);
		}
		$_COOKIE['raouf_csrf'] = $token;
	},
	5
);

function raouf_client_ip_hash() {
	$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : 'unknown';
	return substr( hash( 'sha256', 'raouf|' . $ip ), 0, 16 );
}

function raouf_normalize_phone( $value ) {
	$value = (string) $value;
	$value = str_replace( array( "\u{06F0}", "\u{06F1}", "\u{06F2}", "\u{06F3}", "\u{06F4}", "\u{06F5}", "\u{06F6}", "\u{06F7}", "\u{06F8}", "\u{06F9}" ), array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ), $value );
	$value = str_replace( array( "\u{0660}", "\u{0661}", "\u{0662}", "\u{0663}", "\u{0664}", "\u{0665}", "\u{0666}", "\u{0667}", "\u{0668}", "\u{0669}" ), array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ), $value );
	/* PCRE2 uses \x{...} for Unicode code points; \u{...} is only a PHP string escape. */
	$value = preg_replace( '/[\s\x{200C}\x{200F}\-().]/u', '', $value );
	if ( 0 === strpos( $value, '00989' ) ) {
		$value = '0' . substr( $value, 4 );
	} elseif ( 0 === strpos( $value, '+989' ) ) {
		$value = '0' . substr( $value, 3 );
	} elseif ( 0 === strpos( $value, '989' ) ) {
		$value = '0' . substr( $value, 2 );
	}
	return $value;
}

function raouf_validate_submission( $payload, $kind ) {
	$errors = array();
	$clean  = array(
		'name'    => sanitize_text_field( wp_unslash( isset( $payload['name'] ) ? $payload['name'] : '' ) ),
		'phone'   => '',
		'message' => sanitize_textarea_field( wp_unslash( isset( $payload['message'] ) ? $payload['message'] : '' ) ),
	);
	$raw_phone = isset( $payload['phone'] ) ? wp_unslash( $payload['phone'] ) : '';
	$clean['phone'] = raouf_normalize_phone( $raw_phone );

	if ( mb_strlen( $clean['name'] ) < 2 || mb_strlen( $clean['name'] ) > 80 ||
		! preg_match( '/^[\x{0600}-\x{06FF}\x{0750}-\x{077F}\x{FB50}-\x{FDFF}\x{FE70}-\x{FEFC}\x{200C} A-Za-z\x{00C0}-\x{024F}\'\-.]{2,80}$/u', $clean['name'] ) ) {
		$errors['name'] = 'نام و نام خانوادگی معتبر نیست.';
	}
	if ( ! preg_match( '/^09\d{9}$/', $clean['phone'] ) ) {
		$errors['phone'] = 'شماره تماس معتبر نیست.';
	}
	if ( mb_strlen( $clean['message'] ) > 1200 ) {
		$errors['message'] = 'متن پیام بیش از حد طولانی است.';
	}

	if ( 'registration' === $kind ) {
		$course = sanitize_text_field( wp_unslash( isset( $payload['course'] ) ? $payload['course'] : '' ) );
		if ( ! in_array( $course, raouf_valid_course_ids(), true ) ) {
			$errors['course'] = 'دوره انتخاب شده معتبر نیست.';
		}
		$clean['course'] = $course;
	} else {
		$raw_email = trim( (string) wp_unslash( isset( $payload['email'] ) ? $payload['email'] : '' ) );
		$email     = sanitize_email( $raw_email );
		$subject   = sanitize_text_field( wp_unslash( isset( $payload['subject'] ) ? $payload['subject'] : '' ) );
		/* Match the original app.js rule; sanitize_email() alone would silently
		   drop a malformed address instead of reporting it to the visitor. */
		if ( $raw_email && ( ! preg_match( '/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u', $raw_email ) || strlen( $raw_email ) > 120 || ! is_email( $email ) ) ) {
			$errors['email'] = 'رایانامه معتبر نیست.';
		}
		if ( mb_strlen( $subject ) < 2 || mb_strlen( $subject ) > 120 ) {
			$errors['subject'] = 'موضوع پیام معتبر نیست.';
		}
		if ( mb_strlen( $clean['message'] ) < 10 ) {
			$errors['message'] = 'متن پیام باید حداقل ۱۰ نویسه باشد.';
		}
		$clean['email']   = $email;
		$clean['subject'] = $subject;
	}
	return array( $errors, $clean );
}

function raouf_api_respond( $status, $body ) {
	status_header( $status );
	header( 'Content-Type: application/json; charset=utf-8' );
	header( 'Cache-Control: no-store' );
	echo wp_json_encode( $body );
	exit;
}

/** Intercept the two original endpoints before WordPress routing. */
add_action(
	'parse_request',
	static function ( $wp ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter -- required by the parse_request hook signature.
		$path = raouf_current_path();
		if ( ! preg_match( '#/api/(registrations|contact)/?$#', $path, $matches ) ) {
			return;
		}
		$kind = 'registrations' === $matches[1] ? 'registration' : 'contact';
		$method = isset( $_SERVER['REQUEST_METHOD'] ) ? strtoupper( sanitize_text_field( wp_unslash( $_SERVER['REQUEST_METHOD'] ) ) ) : 'GET';
		if ( 'POST' !== $method ) {
			raouf_api_respond( 405, array( 'ok' => false, 'message' => 'method not allowed' ) );
		}

		// Rate limiting: 8 attempts / 15 min / client.
		$rate_key = 'raouf_rate_' . raouf_client_ip_hash();
		$hits     = (int) get_transient( $rate_key );
		if ( $hits >= 8 ) {
			raouf_api_respond( 429, array( 'ok' => false, 'message' => 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.' ) );
		}
		set_transient( $rate_key, $hits + 1, 15 * MINUTE_IN_SECONDS );

		$raw  = file_get_contents( 'php://input' );
		$data = json_decode( $raw, true );
		if ( ! is_array( $data ) ) {
			$data = array();
		}

		if ( ! empty( $data['website'] ) ) {
			raouf_api_respond( 400, array( 'ok' => false, 'message' => 'درخواست نامعتبر است.' ) );
		}

		// Double-submit CSRF + WordPress nonce verification.
		$cookie = isset( $_COOKIE['raouf_csrf'] ) ? sanitize_text_field( wp_unslash( $_COOKIE['raouf_csrf'] ) ) : '';
		$header = isset( $_SERVER['HTTP_X_CSRF_TOKEN'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_CSRF_TOKEN'] ) ) : '';
		if ( ! $cookie || ! $header || ! hash_equals( $cookie, $header ) || ! wp_verify_nonce( $header, RAOUF_FORM_ACTION ) ) {
			raouf_api_respond( 403, array( 'ok' => false, 'message' => 'نشست فرم معتبر نیست. لطفاً صفحه را بازنشانی کنید.' ) );
		}

		list( $errors, $clean ) = raouf_validate_submission( $data, $kind );
		if ( ! empty( $errors ) ) {
			raouf_api_respond( 400, array( 'ok' => false, 'message' => 'اطلاعات واردشده معتبر نیست.', 'errors' => $errors ) );
		}

		$dedupe_key = $kind . ':' . $clean['phone'] . ':' . ( isset( $clean['course'] ) ? $clean['course'] : $clean['subject'] );
		$transient  = 'raouf_dup_' . md5( $dedupe_key );
		if ( get_transient( $transient ) ) {
			raouf_api_respond( 409, array( 'ok' => false, 'message' => 'این درخواست همین حالا ثبت شده است. لطفاً از ارسال مجدد خودداری کنید.' ) );
		}

		$ref = ( 'registration' === $kind ? 'REG-' : 'MSG-' ) . wp_date( 'Ymd' ) . '-' . strtoupper( bin2hex( random_bytes( 3 ) ) );
		$clean['ip_hash'] = raouf_client_ip_hash();

		/*
		 * The standalone "Raouf Academy Requests" plugin owns the real database
		 * table. When it is active, its filter stores the row BEFORE any success
		 * response. If it is not active, the legacy private CPT fallback still
		 * performs a real WordPress database write; it is migrated later.
		 */
		$stored  = apply_filters( 'raouf_store_submission', null, $kind, $clean, $ref );
		$storage = 'theme-cpt';
		if ( is_wp_error( $stored ) ) {
			$code   = $stored->get_error_code();
			$status = 'raouf_requests_duplicate' === $code ? 409 : 500;
			raouf_api_respond( $status, array( 'ok' => false, 'message' => $stored->get_error_message() ) );
		}
		if ( is_array( $stored ) && ! empty( $stored['ref'] ) ) {
			$ref     = (string) $stored['ref'];
			$storage = 'plugin';
		} else {
			$post_id = wp_insert_post(
				array(
					'post_type'    => 'raouf_submission',
					'post_status'  => 'private',
					'post_title'   => $ref,
					'post_content' => $clean['message'],
				),
				true
			);
			if ( is_wp_error( $post_id ) || ! $post_id ) {
				raouf_api_respond( 500, array( 'ok' => false, 'message' => 'ذخیره سازی اطلاعات انجام نشد. لطفاً دوباره تلاش کنید یا با آموزشگاه تماس بگیرید.' ) );
			}
			$meta = array(
				'_raouf_ref'    => $ref,
				'_raouf_kind'   => $kind,
				'_raouf_name'   => $clean['name'],
				'_raouf_phone'  => $clean['phone'],
				'_raouf_ip'     => $clean['ip_hash'],
			);
			if ( 'registration' === $kind ) {
				$meta['_raouf_course'] = $clean['course'];
			} else {
				$meta['_raouf_email']   = $clean['email'];
				$meta['_raouf_subject'] = $clean['subject'];
			}
			foreach ( $meta as $key => $value ) {
				update_post_meta( $post_id, $key, $value );
			}
		}

		set_transient( $transient, time(), 10 * MINUTE_IN_SECONDS );

		// Optional delivery to a configured administrator email.
		$admin = raouf_option( 'admin_email' );
		$mail  = 'not-configured';
		if ( $admin && is_email( $admin ) ) {
			$subject = 'registration' === $kind ? 'درخواست ثبت نام جدید - ' . $ref : 'پیام تماس جدید - ' . $ref;
			$body    = "شماره پیگیری: {$ref}\nنام: {$clean['name']}\nتماس: {$clean['phone']}\n" .
				( 'registration' === $kind ? "دوره: {$clean['course']}\n" : "موضوع: {$clean['subject']}\nرایانامه: {$clean['email']}\n" ) .
				"\n{$clean['message']}\n";
			$mail = wp_mail( $admin, $subject, $body ) ? 'sent' : 'failed';
		}

		raouf_api_respond(
			201,
			array(
				'ok'            => true,
				'id'            => $ref,
				'message'       => 'اطلاعات با موفقیت ثبت شد.',
				'adminDelivery' => $mail,
				'storage'       => $storage,
			)
		);
	},
	1
);
