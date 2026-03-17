# Chatbot Drop — WordPress Plugin

Drop-in AI chatbot widget for WordPress. Add a floating chat bubble to any page or post with a shortcode.

## Requirements

- WordPress 5.0+
- A running [chatbot-drop](https://github.com/devtony42/chatbot-drop) backend (self-hosted or deployed on Render/Railway)

## Installation

1. Copy the `chatbot-drop-wp/` folder into `wp-content/plugins/`
2. Activate **Chatbot Drop** in WordPress Admin → Plugins
3. Go to **Settings → Chatbot Drop** and enter your server URL and API key
4. Add `[chatbotdrop]` to any page or post

## Shortcode

```
[chatbotdrop]
```

All attributes are optional and override the admin defaults:

| Attribute  | Description                              | Example                          |
|------------|------------------------------------------|----------------------------------|
| `server`   | Backend URL                              | `https://chat.yoursite.com`      |
| `api_key`  | Tenant API key                           | `ten_abc123`                     |
| `title`    | Widget header title                      | `Ask us anything`                |
| `greeting` | First message shown when widget opens    | `Hi! How can I help?`            |
| `stream`   | Enable streaming (`true` / `false`)      | `true`                           |

### Examples

```
[chatbotdrop]
[chatbotdrop title="Support" greeting="How can we help you today?"]
[chatbotdrop server="https://chat.example.com" api_key="ten_xyz" stream="false"]
```

## Notes

- Widget assets (`widget.js`, `widget.css`) are loaded from your chatbot-drop server — no local bundle needed.
- Multiple shortcodes on the same page are supported (each gets its own config).
- The plugin adds no database tables. Uninstalling removes all stored options cleanly.
