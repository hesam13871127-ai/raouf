<?php
/**
 * Shared helpers: editable options, URL tokens, meta state.
 *
 * @package Raouf_Academy
 */

defined( 'ABSPATH' ) || exit;

/**
 * Default values are the exact strings from the original source.
 */
/* Official Balad location. Only the link destination changes; the visible
 * address, icons, layout and markup stay exactly as in the source site. */
define( 'RAOUF_MAP_URL', 'https://balad.ir/p/29UbcoR7CtjsIN' );

/**
 * One-time upgrade of a previously stored OpenStreetMap map URL.
 * A custom administrator URL that is NOT the old search link is left alone,
 * but the public destination below is always forced to the official link.
 */
function raouf_maybe_upgrade_map_url() {
	$stored = get_option( 'raouf_options', array() );
	if ( ! is_array( $stored ) ) {
		return;
	}
	$current = isset( $stored['map_url'] ) ? (string) $stored['map_url'] : '';
	$legacy  = 'https://www.openstreetmap.org/search?query=';
	if ( '' === $current || RAOUF_MAP_URL === $current || 0 === strpos( $current, $legacy ) ) {
		$stored['map_url'] = RAOUF_MAP_URL;
		update_option( 'raouf_options', $stored );
	}
}
add_action( 'init', 'raouf_maybe_upgrade_map_url', 20 );

function raouf_default_options() {
	return array(
		'site_name'      => 'آموزشگاه فنی و حرفه‌ای رئوف',
		'phone_display'  => '+98 9141 803287',
		'phone_tel'      => '+989141803287',
		'address'        => "تبریز، بارون آواک، روبروی مسجد ملاعلی‌اکبر، ساختمان بهنام، طبقه سوم",
		'instagram_user' => 'academi_raouf',
		'instagram_url'  => 'https://www.instagram.com/academi_raouf/',
		'map_url'        => RAOUF_MAP_URL,
		'footer_intro'   => "آموزشگاه فنی و حرفه‌ای رئوف، فضایی برای یادگیری مهارت‌های تخصصی و کاربردی در حوزه‌های زیبایی، پزشکی، داروخانه و ماساژ با رویکرد آموزش عملی.",
		'admin_email'    => '',
	);
}

function raouf_options() {
	$stored = get_option( 'raouf_options', array() );
	if ( ! is_array( $stored ) ) {
		$stored = array();
	}
	$options = wp_parse_args( $stored, raouf_default_options() );
	/* The official Balad destination is mandatory for every stored page and
	 * every rendered token, even if an old option row still contains OSM. */
	$options['map_url'] = RAOUF_MAP_URL;
	return $options;
}

function raouf_option( $key ) {
	$options = raouf_options();
	return isset( $options[ $key ] ) ? $options[ $key ] : '';
}

/**
 * Resolve a theme asset. Administrators may replace individual images with
 * Media Library attachments without editing PHP (see inc/options.php).
 */
function raouf_asset_url( $relative ) {
	$key = ltrim( (string) $relative, '/' );
	if ( 0 !== strpos( $key, 'assets/' ) ) {
		$key = 'assets/' . $key;
	}
	$map = get_option( 'raouf_media', array() );
	if ( is_array( $map ) && ! empty( $map[ $key ] ) ) {
		$url = wp_get_attachment_url( (int) $map[ $key ] );
		if ( $url ) {
			return $url;
		}
	}
	return get_template_directory_uri() . '/' . $key;
}

/**
 * Resolve an internal link through the WordPress URL API.
 */
function raouf_link_url( $path ) {
	$path = (string) $path;
	if ( '' === $path || '/' === $path ) {
		return home_url( '/' );
	}
	$query = '';
	if ( false !== strpos( $path, '?' ) ) {
		list( $path, $query ) = explode( '?', $path, 2 );
		$query = '?' . $query;
	}
	if ( 0 !== strpos( $path, '/' ) ) {
		$path = '/' . $path;
	}
	return home_url( $path ) . $query;
}

/**
 * Expand the conversion tokens into real WordPress URLs / editable values.
 * Every other character of the original markup is left untouched.
 */
function raouf_expand_tokens( $html ) {
	if ( ! is_string( $html ) || '' === $html ) {
		return $html;
	}
	$options = raouf_options();
	$map     = array(
		'{{SITE_NAME}}'     => esc_html( $options['site_name'] ),
		'{{PHONE_DISPLAY}}' => esc_html( $options['phone_display'] ),
		'{{PHONE_TEL}}'     => esc_attr( $options['phone_tel'] ),
		'{{ADDRESS}}'       => esc_html( $options['address'] ),
		'{{INSTA_URL}}'     => esc_url( $options['instagram_url'] ),
		'{{INSTA_USER}}'    => esc_html( $options['instagram_user'] ),
		'{{MAP_URL}}'       => esc_url( $options['map_url'] ),
		'{{FOOTER_INTRO}}'  => esc_html( $options['footer_intro'] ),
		'{{YEAR}}'          => esc_html( wp_date( 'Y' ) ),
		'{{HOME}}'          => esc_url( home_url() ),
	);
	$html = preg_replace_callback(
		'/\{\{ASSET:([^}]+)\}\}/',
		static function ( $m ) {
			return esc_url( raouf_asset_url( $m[1] ) );
		},
		$html
	);
	$html = preg_replace_callback(
		'/\{\{LINK:([^}]+)\}\}/',
		static function ( $m ) {
			return esc_url( raouf_link_url( $m[1] ) );
		},
		$html
	);
	return strtr( $html, $map );
}

/* ------------------------------------------------------------- page meta */
function raouf_meta_defaults() {
	return array(
		'title'       => raouf_option( 'site_name' ),
		'description' => '',
		'canonical'   => '/',
		'og_image'    => 'assets/images/hero-academy.webp',
		'og_url'      => '',
		'page_key'    => '',
		'body_class'  => '',
		'jsonld'      => '',
		'lightbox'    => false,
	);
}

function raouf_set_meta( $meta ) {
	$GLOBALS['raouf_meta'] = wp_parse_args( (array) $meta, raouf_meta_defaults() );
}

function raouf_meta_all() {
	if ( ! isset( $GLOBALS['raouf_meta'] ) ) {
		raouf_set_meta( array() );
	}
	return $GLOBALS['raouf_meta'];
}

function raouf_meta( $key ) {
	$meta = raouf_meta_all();
	return isset( $meta[ $key ] ) ? $meta[ $key ] : '';
}

function raouf_current_path() {
	$uri  = isset( $_SERVER['REQUEST_URI'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '/';
	$path = wp_parse_url( $uri, PHP_URL_PATH );
	return $path ? $path : '/';
}

/**
 * Read the original per-page meta from post meta (written on activation),
 * with a slug-based fallback to the generated source definitions.
 */
function raouf_prepare_meta_for_current_page() {
	if ( isset( $GLOBALS['raouf_meta'] ) ) {
		return;
	}
	$post = get_queried_object();
	if ( is_front_page() && get_option( 'page_on_front' ) ) {
		$post = get_post( (int) get_option( 'page_on_front' ) );
	}
	$meta = array();
	if ( $post instanceof WP_Post ) {
		$stored = get_post_meta( $post->ID, '_raouf_meta', true );
		if ( is_array( $stored ) ) {
			$meta = $stored;
		}
		if ( empty( $meta ) ) {
			foreach ( raouf_source_pages() as $definition ) {
				if ( $definition['slug'] === $post->post_name ) {
					$meta = $definition['meta'];
					break;
				}
			}
		}
	}
	raouf_set_meta( $meta );
}
