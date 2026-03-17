<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register admin settings page under Settings > Chatbot Drop.
 */
add_action( 'admin_menu', 'chatbotdrop_add_settings_page' );
function chatbotdrop_add_settings_page() {
	add_options_page(
		'Chatbot Drop Settings',
		'Chatbot Drop',
		'manage_options',
		'chatbot-drop',
		'chatbotdrop_render_settings_page'
	);
}

add_action( 'admin_init', 'chatbotdrop_register_settings' );
function chatbotdrop_register_settings() {
	register_setting( 'chatbotdrop_settings', 'chatbotdrop_server_url', array( 'sanitize_callback' => 'esc_url_raw' ) );
	register_setting( 'chatbotdrop_settings', 'chatbotdrop_api_key',    array( 'sanitize_callback' => 'sanitize_text_field' ) );
	register_setting( 'chatbotdrop_settings', 'chatbotdrop_title',      array( 'sanitize_callback' => 'sanitize_text_field' ) );
	register_setting( 'chatbotdrop_settings', 'chatbotdrop_greeting',   array( 'sanitize_callback' => 'sanitize_text_field' ) );
	register_setting( 'chatbotdrop_settings', 'chatbotdrop_stream',     array( 'sanitize_callback' => 'sanitize_text_field' ) );

	add_settings_section( 'chatbotdrop_main', 'Connection', '__return_false', 'chatbot-drop' );
	add_settings_section( 'chatbotdrop_display', 'Widget Defaults', '__return_false', 'chatbot-drop' );

	add_settings_field( 'chatbotdrop_server_url', 'Server URL',      'chatbotdrop_field_server_url', 'chatbot-drop', 'chatbotdrop_main' );
	add_settings_field( 'chatbotdrop_api_key',    'API Key',         'chatbotdrop_field_api_key',    'chatbot-drop', 'chatbotdrop_main' );
	add_settings_field( 'chatbotdrop_title',      'Widget Title',    'chatbotdrop_field_title',      'chatbot-drop', 'chatbotdrop_display' );
	add_settings_field( 'chatbotdrop_greeting',   'Greeting Message','chatbotdrop_field_greeting',   'chatbot-drop', 'chatbotdrop_display' );
	add_settings_field( 'chatbotdrop_stream',     'Streaming',       'chatbotdrop_field_stream',     'chatbot-drop', 'chatbotdrop_display' );
}

function chatbotdrop_field_server_url() {
	$val = esc_url( get_option( 'chatbotdrop_server_url', '' ) );
	echo '<input type="url" name="chatbotdrop_server_url" value="' . esc_attr( $val ) . '" class="regular-text" placeholder="https://your-chatbot-server.com" />';
	echo '<p class="description">Base URL of your chatbot-drop backend (no trailing slash).</p>';
}

function chatbotdrop_field_api_key() {
	$val = esc_attr( get_option( 'chatbotdrop_api_key', '' ) );
	echo '<input type="password" name="chatbotdrop_api_key" value="' . esc_attr( $val ) . '" class="regular-text" placeholder="ten_..." />';
	echo '<p class="description">Tenant API key from your chatbot-drop admin. Leave blank for public tenants.</p>';
}

function chatbotdrop_field_title() {
	$val = esc_attr( get_option( 'chatbotdrop_title', 'Chat with us' ) );
	echo '<input type="text" name="chatbotdrop_title" value="' . esc_attr( $val ) . '" class="regular-text" />';
	echo '<p class="description">Header title shown in the chat panel. Can be overridden per-shortcode.</p>';
}

function chatbotdrop_field_greeting() {
	$val = esc_attr( get_option( 'chatbotdrop_greeting', 'Hi! How can I help you today?' ) );
	echo '<input type="text" name="chatbotdrop_greeting" value="' . esc_attr( $val ) . '" class="regular-text" />';
	echo '<p class="description">First message shown when the widget opens. Can be overridden per-shortcode.</p>';
}

function chatbotdrop_field_stream() {
	$val = get_option( 'chatbotdrop_stream', 'true' );
	echo '<select name="chatbotdrop_stream">';
	echo '<option value="true"'  . selected( $val, 'true', false )  . '>Enabled (token-by-token streaming)</option>';
	echo '<option value="false"' . selected( $val, 'false', false ) . '>Disabled (full response at once)</option>';
	echo '</select>';
	echo '<p class="description">Streaming gives a more responsive feel but requires SSE support on your server.</p>';
}

function chatbotdrop_render_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) return;
	?>
	<div class="wrap">
		<h1>Chatbot Drop</h1>
		<p>Configure your AI chatbot widget. Use <code>[chatbotdrop]</code> on any page or post.</p>
		<form method="post" action="options.php">
			<?php
			settings_fields( 'chatbotdrop_settings' );
			do_settings_sections( 'chatbot-drop' );
			submit_button();
			?>
		</form>
		<hr>
		<h2>Shortcode Reference</h2>
		<p>Drop the widget anywhere with a shortcode. Attributes override the defaults above.</p>
		<pre style="background:#f6f7f7;padding:12px;border-radius:4px;font-size:13px;">[chatbotdrop]
[chatbotdrop title="Ask us anything" greeting="Hello! What can I help with?"]
[chatbotdrop server="https://other-server.com" api_key="ten_xyz" stream="false"]</pre>
	</div>
	<?php
}
