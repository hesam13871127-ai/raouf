<?php
/**
 * Real WordPress navigation menus rendered with the exact original markup.
 *
 * @package Raouf_Academy
 */

defined( 'ABSPATH' ) || exit;

function raouf_menu_tree( $location ) {
	$locations = get_nav_menu_locations();
	$menu_id   = isset( $locations[ $location ] ) ? (int) $locations[ $location ] : 0;
	if ( ! $menu_id ) {
		return array();
	}
	$items = wp_get_nav_menu_items( $menu_id, array( 'orderby' => 'menu_order', 'order' => 'ASC' ) );
	if ( ! $items ) {
		return array();
	}
	$top      = array();
	$children = array();
	foreach ( $items as $item ) {
		$parent = (int) $item->menu_item_parent;
		if ( 0 === $parent ) {
			$top[] = $item;
		} else {
			$children[ $parent ][] = $item;
		}
	}
	return array(
		'top'      => $top,
		'children' => $children,
	);
}

function raouf_is_current_url( $url ) {
	$path    = wp_parse_url( $url, PHP_URL_PATH );
	$current = raouf_current_path();
	if ( ! $path ) {
		$path = '/';
	}
	$path    = '/' . trim( $path, '/' );
	$current = '/' . trim( $current, '/' );
	return $path === $current;
}

/** The original opens the courses drawer on every course route, but only
 *  marks the courses listing itself as the active navigation item. */
function raouf_is_courses_section() {
	$current = '/' . trim( raouf_current_path(), '/' );
	return '/courses' === $current || 0 === strpos( $current, '/courses/' );
}

function raouf_course_icon_for_url( $url ) {
	$slug = basename( (string) wp_parse_url( $url, PHP_URL_PATH ) );
	$map  = array(
		'skin-facial'          => 'sparkles',
		'medical-emergency'    => 'stethoscope',
		'pharmacy-technician'  => 'pill',
		'massage-relaxation'   => 'leaf',
	);
	return isset( $map[ $slug ] ) ? $map[ $slug ] : 'bookOpen';
}

/** Desktop header navigation (exact original DOM). */
function raouf_primary_menu() {
	$tree = raouf_menu_tree( 'raouf_primary' );
	if ( empty( $tree['top'] ) ) {
		raouf_nav_fallback( 'primary' );
		return;
	}
	echo '<nav class="desktop-nav" aria-label="ناوبری اصلی"><ul class="nav-list">';
	foreach ( $tree['top'] as $item ) {
		$active = raouf_is_current_url( $item->url ) ? ' is-active' : '';
		if ( ! empty( $tree['children'][ $item->ID ] ) ) {
			echo '<li class="has-dropdown" data-dropdown>';
			echo '<button type="button" class="nav-link nav-link--toggle' . esc_attr( $active ) . '" aria-expanded="false" aria-controls="coursesDropdown">' . esc_html( $item->title ) . raouf_icon( 'chevronDown', 'nav-chevron', 16 ) . '</button>'; // phpcs:ignore WordPress.Security.EscapeOutput -- exact static source markup/SVG; dynamic tokens are escaped.
			echo '<div class="dropdown" id="coursesDropdown">';
			echo '<span class="dropdown-title">دوره‌های تخصصی</span>';
			foreach ( $tree['children'][ $item->ID ] as $child ) {
				echo '<a href="' . esc_url( $child->url ) . '" class="dropdown-link">' . raouf_icon( raouf_course_icon_for_url( $child->url ), '', 19 ) . '<span>' . esc_html( $child->title ) . '</span>' . raouf_icon( 'chevronLeft', 'dropdown-arrow', 15 ) . '</a>'; // phpcs:ignore WordPress.Security.EscapeOutput -- exact static source markup/SVG; dynamic tokens are escaped.
			}
			echo '<a href="' . esc_url( raouf_link_url( '/courses/' ) ) . '" class="dropdown-all">همه دوره‌ها ' . raouf_icon( 'arrowLeft', '', 16 ) . '</a>'; // phpcs:ignore WordPress.Security.EscapeOutput -- exact static source markup/SVG; dynamic tokens are escaped.
			echo '</div></li>';
		} else {
			echo '<li><a class="nav-link' . esc_attr( $active ) . '" href="' . esc_url( $item->url ) . '">' . esc_html( $item->title ) . '</a></li>';
		}
	}
	echo '</ul></nav>';
}

/** Mobile drawer (exact original DOM, same WordPress menu). */
function raouf_mobile_menu() {
	$tree = raouf_menu_tree( 'raouf_primary' );
	if ( empty( $tree['top'] ) ) {
		raouf_nav_fallback( 'mobile' );
		return;
	}
	$course_parent = null;
	foreach ( $tree['top'] as $item ) {
		if ( ! empty( $tree['children'][ $item->ID ] ) ) {
			$course_parent = $item;
			break;
		}
	}
	$open = raouf_is_courses_section() ? ' open' : '';
	foreach ( $tree['top'] as $item ) {
		$active = raouf_is_current_url( $item->url ) ? ' is-active' : '';
		if ( $course_parent && $item->ID === $course_parent->ID ) {
			echo '<details class="mobile-sub" ' . ( '' !== $open ? 'open' : '' ) . '>';
			echo '<summary class="mobile-link mobile-link--summary' . esc_attr( $active ) . '">' . esc_html( $item->title ) . raouf_icon( 'chevronDown', '', 18 ) . '</summary>'; // phpcs:ignore WordPress.Security.EscapeOutput -- exact static source markup/SVG; dynamic tokens are escaped.
			echo '<div class="mobile-sub-links">';
			foreach ( $tree['children'][ $item->ID ] as $child ) {
				echo '<a href="' . esc_url( $child->url ) . '">' . esc_html( $child->title ) . '</a>';
			}
			echo '<a href="' . esc_url( raouf_link_url( '/courses/' ) ) . '">همه دوره‌ها</a>';
			echo '</div></details>';
		} else {
			echo '<a class="mobile-link' . esc_attr( $active ) . '" href="' . esc_url( $item->url ) . '">' . esc_html( $item->title ) . '</a>';
		}
	}
	echo '<div class="mobile-nav-actions">';
	echo '<a class="btn btn--primary" href="' . esc_url( raouf_link_url( '/register/' ) ) . '">مشاوره و ثبت‌نام</a>';
	echo '<a class="btn btn--ghost-dark" href="tel:' . esc_attr( raouf_option( 'phone_tel' ) ) . '">' . raouf_icon( 'phone', '', 18 ) . ' <span dir="ltr">' . esc_html( raouf_option( 'phone_display' ) ) . '</span></a>'; // phpcs:ignore WordPress.Security.EscapeOutput -- exact static source markup/SVG; dynamic tokens are escaped.
	echo '</div>';
	echo '<a class="mobile-nav-insta" href="' . esc_url( raouf_option( 'instagram_url' ) ) . '" target="_blank" rel="noopener noreferrer">' . raouf_icon( 'instagram', '', 18 ) . ' ' . esc_html( raouf_option( 'instagram_user' ) ) . '</a>'; // phpcs:ignore WordPress.Security.EscapeOutput -- exact static source markup/SVG; dynamic tokens are escaped.
}

/** Footer quick links column. */
function raouf_footer_menu() {
	$tree = raouf_menu_tree( 'raouf_primary' );
	if ( empty( $tree['top'] ) ) {
		raouf_nav_fallback( 'footer' );
		return;
	}
	echo '<ul>';
	foreach ( $tree['top'] as $item ) {
		echo '<li><a href="' . esc_url( $item->url ) . '">' . esc_html( $item->title ) . '</a></li>';
	}
	echo '<li><a href="' . esc_url( raouf_link_url( '/register/' ) ) . '">مشاوره و ثبت‌نام</a></li>';
	echo '</ul>';
}

/** Footer courses column. */
function raouf_courses_menu() {
	$tree = raouf_menu_tree( 'raouf_courses' );
	if ( empty( $tree['top'] ) ) {
		raouf_nav_fallback( 'courses' );
		return;
	}
	echo '<ul>';
	foreach ( $tree['top'] as $item ) {
		echo '<li><a href="' . esc_url( $item->url ) . '">' . esc_html( $item->title ) . '</a></li>';
	}
	echo '</ul>';
}
