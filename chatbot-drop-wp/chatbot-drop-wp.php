<?php
/**
 * Plugin Name: Chatbot Drop
 * Plugin URI:  https://github.com/devtony42/chatbot-drop
 * Description: Drop-in AI chatbot widget. Multi-provider, streaming, multi-tenant. Embed in any page with a shortcode.
 * Version:     0.1.0
 * Requires at least: 5.0
 * Tested up to: 6.4
 * License:     MIT
 * License URI: https://opensource.org/licenses/MIT
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'CHATBOTDROP_VERSION', '0.1.0' );
define( 'CHATBOTDROP_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'CHATBOTDROP_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once CHATBOTDROP_PLUGIN_DIR . 'includes/settings.php';
require_once CHATBOTDROP_PLUGIN_DIR . 'includes/shortcode.php';

/**
 * Clean up options on uninstall.
 */
register_uninstall_hook( __FILE__, 'chatbotdrop_uninstall' );
function chatbotdrop_uninstall() {
	delete_option( 'chatbotdrop_server_url' );
	delete_option( 'chatbotdrop_api_key' );
	delete_option( 'chatbotdrop_title' );
	delete_option( 'chatbotdrop_greeting' );
	delete_option( 'chatbotdrop_stream' );
}
