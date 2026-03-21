<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register the [chatbotdrop] shortcode.
 */
add_shortcode( 'chatbotdrop', 'chatbotdrop_shortcode' );

/**
 * Handle the [chatbotdrop] shortcode.
 *
 * Usage:
 *   [chatbotdrop]
 *   [chatbotdrop title="Ask us anything" greeting="Hello!"]
 *   [chatbotdrop server="https://other-server.com" api_key="ten_xyz" stream="false"]
 *
 * Shortcode attributes override the values configured in Settings > Chatbot Drop.
 *
 * @param array $atts Shortcode attributes.
 * @return string HTML output (empty — widget mounts itself via JS).
 */
function chatbotdrop_shortcode( $atts ) {
	$atts = shortcode_atts(
		array(
			'server'    => '',
			'api_key'   => '',
			'title'     => '',
			'greeting'  => '',
			'stream'    => '',
			'color'     => '',
			'radius'    => '',
			'font_size' => '',
		),
		$atts,
		'chatbotdrop'
	);

	// Resolve values: shortcode attr > WP option > hardcoded default.
	$server    = esc_url( $atts['server']   ?: get_option( 'chatbotdrop_server_url', '' ) );
	$api_key   = sanitize_text_field( $atts['api_key']  ?: get_option( 'chatbotdrop_api_key', '' ) );
	$title     = sanitize_text_field( $atts['title']    ?: get_option( 'chatbotdrop_title', 'Chat with us' ) );
	$greeting  = sanitize_text_field( $atts['greeting'] ?: get_option( 'chatbotdrop_greeting', 'Hi! How can I help you today?' ) );
	$stream    = sanitize_text_field( $atts['stream']   ?: get_option( 'chatbotdrop_stream', 'true' ) );
	$color     = sanitize_hex_color( $atts['color'] );
	$radius    = sanitize_text_field( $atts['radius'] );
	$font_size = sanitize_text_field( $atts['font_size'] );

	if ( empty( $server ) ) {
		return '<!-- Chatbot Drop: server URL not configured. Visit Settings > Chatbot Drop. -->';
	}

	// Enqueue widget assets from the configured server.
	// We use wp_enqueue_script/style so they're only added once even with multiple shortcodes.
	static $enqueued = false;
	if ( ! $enqueued ) {
		wp_enqueue_style(
			'chatbot-drop-widget',
			trailingslashit( $server ) . 'css/widget.css',
			array(),
			CHATBOTDROP_VERSION
		);
		wp_enqueue_script(
			'chatbot-drop-widget',
			trailingslashit( $server ) . 'js/widget.js',
			array(),
			CHATBOTDROP_VERSION,
			true  // load in footer
		);
		$enqueued = true;
	}

	// Build data attributes for the script tag.
	// The widget reads these from document.currentScript, so we output a second
	// inline <script> that re-initialises with the per-shortcode config.
	// This mirrors the standalone embed pattern (data-* attributes on <script>).
	$data_attrs = sprintf(
		'data-server="%s" data-title="%s" data-greeting="%s" data-stream="%s"%s',
		esc_attr( $server ),
		esc_attr( $title ),
		esc_attr( $greeting ),
		esc_attr( $stream ),
		$api_key ? ' data-api-key="' . esc_attr( $api_key ) . '"' : ''
	);

	// Output a config block. The widget.js init() is already called on DOMContentLoaded
	// from the enqueued script tag — but we need per-instance config.
	// We store config in a global array that widget.js reads on init.
	static $instance = 0;
	$instance++;
	$config_var = 'chatbotDropConfig_' . $instance;

	$config = array(
		'server'   => $server,
		'title'    => $title,
		'greeting' => $greeting,
		'stream'   => $stream === 'true',
		'apiKey'   => $api_key,
	);
	if ( $color )     { $config['color']    = $color; }
	if ( $radius )    { $config['radius']   = $radius; }
	if ( $font_size ) { $config['fontSize'] = $font_size; }

	return sprintf(
		'<script id="%s" type="application/json">%s</script>',
		esc_attr( $config_var ),
		wp_json_encode( $config )
	) . sprintf(
		'<script>
			(function() {
				var cfg = JSON.parse(document.getElementById(%s).textContent);
				if (window.ChatbotDrop && window.ChatbotDrop.init) {
					window.ChatbotDrop.init(cfg);
				} else {
					document.addEventListener("chatbotdrop:ready", function() {
						window.ChatbotDrop.init(cfg);
					});
				}
			})();
		</script>',
		wp_json_encode( $config_var )
	);
}
