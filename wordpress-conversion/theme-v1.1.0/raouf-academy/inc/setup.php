<?php
/**
 * Theme activation: create the original pages as editable WordPress pages,
 * set the front page, seed real navigation menus and register submissions CPT.
 *
 * @package Raouf_Academy
 */

defined( 'ABSPATH' ) || exit;

/**
 * Private form submissions must be readable by administrators only.
 *
 * WordPress derives `read_private_posts` / `edit_others_posts` from the
 * default `capability_type => 'post'`. Editors and administrators of a
 * multisite network hold those capabilities, so any non-administrator could
 * read or edit private records containing names, phone numbers and e-mail
 * addresses through core meta-capability checks even though the CPT has no
 * UI. A dedicated capability type plus primitive caps mapped to
 * `manage_options` closes that path (Stage D defect SD-01). The three *meta*
 * caps stay custom so `_post_type_meta_capabilities()` never registers
 * `manage_options` as a meta-cap alias.
 *
 * @return void
 */
function raouf_register_submission_cpt() {
	register_post_type(
		'raouf_submission',
		array(
			'labels'              => array(
				'name'          => __( 'درخواست‌ها', 'raouf-academy' ),
				'singular_name' => __( 'درخواست', 'raouf-academy' ),
			),
			'public'              => false,
			'show_ui'             => false,
			'show_in_menu'        => false,
			'publicly_queryable'  => false,
			'exclude_from_search' => true,
			'has_archive'         => false,
			'supports'            => array( 'title', 'editor' ),
			'capability_type'     => array( 'raouf_submission', 'raouf_submissions' ),
			'map_meta_cap'        => true,
			'capabilities'        => array(
				'edit_posts'             => 'manage_options',
				'edit_others_posts'      => 'manage_options',
				'delete_posts'           => 'manage_options',
				'publish_posts'          => 'manage_options',
				'read_private_posts'     => 'manage_options',
				'delete_private_posts'   => 'manage_options',
				'delete_published_posts' => 'manage_options',
				'delete_others_posts'    => 'manage_options',
				'edit_private_posts'     => 'manage_options',
				'edit_published_posts'   => 'manage_options',
				'create_posts'           => 'manage_options',
			),
		)
	);
}
add_action( 'init', 'raouf_register_submission_cpt' );

/**
 * Remove only WordPress' own untouched placeholder content. A fresh core
 * install ships a "Sample Page" whose body contains the installation URL;
 * removing it keeps a clean install free of both stray pages and baked URLs.
 * Anything a site owner has edited is left strictly alone.
 */
function raouf_remove_core_placeholders() {
	$defaults = array(
		'sample-page' => array( 'page', 'Sample Page', 'This is an example page' ),
		'hello-world' => array( 'post', 'Hello world!', 'Welcome to WordPress' ),
	);
	foreach ( $defaults as $slug => $spec ) {
		$found = get_page_by_path( $slug, OBJECT, $spec[0] );
		if ( ! ( $found instanceof WP_Post ) || $spec[1] !== $found->post_title || false === strpos( $found->post_content, $spec[2] ) ) {
			continue;
		}
		wp_delete_post( $found->ID, true );
	}
}

/**
 * Import / re-import the exact original page markup into WordPress pages.
 * Existing pages are only overwritten when $force is true (resync button).
 */
function raouf_import_pages( $force = false ) {
	raouf_remove_core_placeholders();
	$definitions = raouf_source_pages();
	$ids         = array();

	if ( function_exists( 'kses_remove_filters' ) ) {
		kses_remove_filters();
	}

	// Pass 1: top-level pages.
	foreach ( $definitions as $definition ) {
		if ( ! empty( $definition['parent'] ) ) {
			continue;
		}
		$ids[ $definition['slug'] ] = raouf_upsert_page( $definition, 0, $force );
	}
	// Pass 2: course child pages (preserves /courses/<slug>/ permalinks).
	foreach ( $definitions as $definition ) {
		if ( empty( $definition['parent'] ) ) {
			continue;
		}
		$parent_id                  = isset( $ids[ $definition['parent'] ] ) ? $ids[ $definition['parent'] ] : 0;
		$ids[ $definition['slug'] ] = raouf_upsert_page( $definition, $parent_id, $force );
	}

	if ( function_exists( 'kses_init_filters' ) ) {
		kses_init_filters();
	}

	// Front page settings (WordPress Settings > Reading).
	if ( ! empty( $ids['home'] ) ) {
		update_option( 'show_on_front', 'page' );
		update_option( 'page_on_front', (int) $ids['home'] );
		update_option( 'page_for_posts', 0 );
	}

	// Clean URLs matching the original routes.
	if ( '' === get_option( 'permalink_structure' ) ) {
		update_option( 'permalink_structure', '/%postname%/' );
	}
	flush_rewrite_rules();

	raouf_create_default_menus( $ids );
	return $ids;
}

function raouf_upsert_page( $definition, $parent_id, $force ) {
	$path = ( $parent_id ? 'courses/' : '' ) . $definition['slug'];
	$page = get_page_by_path( $path, OBJECT, 'page' );
	/*
	 * Keep the reusable {{ASSET:}} / {{LINK:}} / value tokens in post_content.
	 * They are resolved by raouf_expand_tokens() at render time, so the saved
	 * markup stays valid after a domain change, a move to production or a
	 * WordPress subdirectory install. Expanding here would bake installation
	 * URLs into the database (defect D01).
	 */
	$content = wp_slash( $definition['content'] );

	$args = array(
		'post_title'     => $definition['title'],
		'post_name'      => $definition['slug'],
		'post_status'    => 'publish',
		'post_type'      => 'page',
		'post_parent'    => (int) $parent_id,
		'post_content'   => $content,
		'comment_status' => 'closed',
		'ping_status'    => 'closed',
	);

	if ( $page instanceof WP_Post ) {
		if ( $force ) {
			$args['ID'] = $page->ID;
			wp_update_post( $args );
		}
		$id = $page->ID;
	} else {
		$id = wp_insert_post( $args, true );
		if ( is_wp_error( $id ) ) {
			return 0;
		}
	}

	update_post_meta( $id, '_raouf_meta', $definition['meta'] );
	update_post_meta( $id, '_wp_page_template', $definition['template'] );
	return (int) $id;
}

/** Create real WordPress menus with the original items, assigned to locations. */
function raouf_create_default_menus( $ids ) {
	/* Resync must never duplicate menus or menu items (D10 / D05 hardening). */
	$existing = get_nav_menu_locations();
	if ( ! empty( $existing['raouf_primary'] ) && ! empty( $existing['raouf_courses'] ) ) {
		return;
	}
	$primary = wp_create_nav_menu( __( 'منوی اصلی رئوف', 'raouf-academy' ) );
	if ( ! is_wp_error( $primary ) ) {
		$order = array(
			'home'     => 'خانه',
			'courses'  => 'دوره‌های آموزشی',
			'about'    => 'درباره آموزشگاه',
			'gallery'  => 'گالری تصاویر',
			'contact'  => 'تماس با ما',
		);
		$courses_item = 0;
		foreach ( $order as $slug => $label ) {
			if ( empty( $ids[ $slug ] ) ) {
				continue;
			}
			$item_id = wp_update_nav_menu_item(
				$primary,
				0,
				array(
					'menu-item-title'     => $label,
					'menu-item-object'    => 'page',
					'menu-item-object-id' => $ids[ $slug ],
					'menu-item-type'      => 'post_type',
					'menu-item-status'    => 'publish',
				)
			);
			if ( 'courses' === $slug && ! is_wp_error( $item_id ) ) {
				$courses_item = $item_id;
			}
		}
		$course_slugs = array(
			'skin-facial'          => 'پاکسازی و فیشیال پوست',
			'medical-emergency'    => 'فوریت‌های پزشکی و کمک‌های اولیه',
			'pharmacy-technician'  => 'تکنسین داروخانه و نسخه‌خوانی',
			'massage-relaxation'   => 'ماساژ و ریلکسیشن',
		);
		foreach ( $course_slugs as $slug => $label ) {
			if ( empty( $ids[ $slug ] ) ) {
				continue;
			}
			wp_update_nav_menu_item(
				$primary,
				0,
				array(
					'menu-item-title'      => $label,
					'menu-item-object'     => 'page',
					'menu-item-object-id'  => $ids[ $slug ],
					'menu-item-type'       => 'post_type',
					'menu-item-status'     => 'publish',
					'menu-item-parent-id'  => $courses_item,
				)
			);
		}
	}

	$courses_menu = wp_create_nav_menu( __( 'دوره‌های آموزشی رئوف', 'raouf-academy' ) );
	if ( ! is_wp_error( $courses_menu ) ) {
		foreach ( array(
			'skin-facial'         => 'پاکسازی و فیشیال پوست',
			'medical-emergency'   => 'فوریت‌های پزشکی و کمک‌های اولیه',
			'pharmacy-technician' => 'تکنسین داروخانه و نسخه‌خوانی',
			'massage-relaxation'  => 'ماساژ و ریلکسیشن',
		) as $slug => $label ) {
			if ( empty( $ids[ $slug ] ) ) {
				continue;
			}
			wp_update_nav_menu_item(
				$courses_menu,
				0,
				array(
					'menu-item-title'     => $label,
					'menu-item-object'    => 'page',
					'menu-item-object-id' => $ids[ $slug ],
					'menu-item-type'      => 'post_type',
					'menu-item-status'    => 'publish',
				)
			);
		}
	}

	$locations = get_nav_menu_locations();
	if ( ! is_wp_error( $primary ) ) {
		$locations['raouf_primary'] = $primary;
	}
	if ( ! is_wp_error( $courses_menu ) ) {
		$locations['raouf_courses'] = $courses_menu;
	}
	set_theme_mod( 'nav_menu_locations', $locations );
}

add_action( 'after_switch_theme', static function () { raouf_import_pages( false ); } );

add_action(
	'admin_post_raouf_resync_pages',
	static function () {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'دسترسی غیرمجاز', 'raouf-academy' ), '', array( 'response' => 403 ) );
		}
		check_admin_referer( 'raouf_resync_pages' );
		raouf_import_pages( true );
		wp_safe_redirect( admin_url( 'themes.php?page=raouf-options&raouf-resynced=1' ) );
		exit;
	}
);
