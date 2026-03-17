# chatbot-drop — Backlog & Roadmap

> Drop-in AI chatbot widget. Multi-provider, streaming, multi-tenant.

---

## Roadmap

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Multi-provider AI (OpenAI / Claude / Gemini) | Done | Switch via env var |
| 2 | Streaming SSE responses | Done | Token-by-token via `/api/chat/stream` |
| 3 | Conversation session management | Done | In-memory store, session IDs |
| 4 | Multi-tenant API keys | Done | Per-tenant config overrides |
| 5 | API key security hardening | Done | scrypt, timing-safe compare, 256-bit entropy |
| 6 | CI + streaming tests | Done | GitHub Actions, Vitest |
| 7 | Embed widget (`widget.js` + `widget.css`) | Done | `<script>` tag drop-in, floating chat bubble |
| 8 | WordPress plugin (`chatbot-drop-wp`) | Backlog | See below |
| 9 | Live demo on Render/Railway | Backlog | See below |
| 10 | Persistent conversation storage | Backlog | See below |
| 11 | Admin dashboard UI | Backlog | See below |
| 12 | Webhook/callback support | Backlog | See below |

---

## Backlog

### WordPress Plugin (`chatbot-drop-wp`) — Medium Lift (1–2 days)

Thin WP plugin wrapper around the existing embed widget. Same pattern as `calc-drop-wp`.

**Shortcode:**
```
[chatbotdrop server="https://your-server.com" api_key="ten_abc123" title="Chat with us" greeting="Hi! How can I help?"]
```

**Features:**
- Shortcode enqueues `widget.js` + `widget.css` from the configured server URL
- WP Admin settings page: server URL, API key, default title, default greeting, streaming on/off
- Shortcode attributes override admin defaults per-instance
- Works on any page/post — including Elementor/Kadence widget areas
- Clean uninstall hook (removes options)

**Deliverables:**
- `chatbot-drop-wp/chatbot-drop-wp.php` — main plugin file
- `chatbot-drop-wp/includes/shortcode.php` — shortcode handler
- `chatbot-drop-wp/includes/settings.php` — WP Admin settings page
- `chatbot-drop-wp/README.md` — install + usage guide
- Lives in `chatbot-drop-wp/` directory in this repo (same as calc-drop pattern)

---

### Live Demo on Render/Railway — Quick Win (< 1 day)

Deploy a public demo instance so the Upwork listing has a real URL.

- `render.yaml` / `railway.toml` one-click deploy config (render.yaml already present)
- Demo instance at `demo.chatbot-drop.dev` (or subdomain of chooseyourownapp.com)
- Public demo uses a read-only tenant with a pre-seeded API key
- "Deploy your own" button in README links to Render/Railway
- **Blocker for Upwork listing going live**

---

### Persistent Conversation Storage — Medium Lift (1–3 days)

Currently conversations are stored in memory — a server restart wipes all history.

- Replace in-memory `ConversationStore` with PostgreSQL (same pattern as multi-tenant config)
- Schema: `conversations(id, tenant_id, session_id, messages jsonb, created_at, updated_at)`
- Optional TTL: prune conversations older than N days
- Zero breaking API changes — same session ID interface

---

### Admin Dashboard UI — Medium Lift (2–3 days)

Currently tenant management is API-only. A UI would make this client-hand-offable.

- React SPA served at `/admin` (same pattern as the demo page)
- Login with `ADMIN_API_KEY`
- Tenant list: create, view, rotate API key, delete
- Per-tenant usage stats: message count, last active
- Branding overrides per tenant (title, greeting, color)

---

### Webhook / Callback Support — Medium Lift (1–2 days)

Fire events to an external URL on conversation activity — Zapier/Make/n8n compatible.

- Per-tenant `webhook_url` config
- Events: `message.received`, `message.sent`, `session.started`, `session.ended`
- Payload: tenant ID, session ID, message content, timestamp
- Retry on failure (3x with exponential backoff)
- Useful for: CRM updates, lead capture, notification pipelines

---

## Ideas Parking Lot
- Slack / Discord channel integration (reply in thread, not just widget)
- WhatsApp Cloud API backend (Pattern #2 from market scan — $800-1.5K positioning)
- Rate limiting per tenant (max messages/hour)
- Custom CSS theming via shortcode attributes (`data-color`, `data-radius`)
- `npx chatbot-drop init` CLI scaffolder

---

## Version Targets

| Version | Goal |
|---------|------|
| v0.1 | Core backend — streaming, sessions, multi-tenant |
| v0.2 | Security hardening + CI |
| v0.3 | WP plugin + live demo |
| v1.0 | Persistent storage + admin UI + webhooks |
