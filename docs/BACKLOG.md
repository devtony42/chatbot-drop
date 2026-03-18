# chatbot-drop — Backlog & Roadmap

> Drop-in AI chatbot widget. Multi-provider, streaming, multi-tenant.

---

## Version Targets

| Version | Goal |
|---------|------|
| v0.1 | Core backend — streaming, sessions, multi-tenant |
| v0.2 | Security hardening + CI |
| v0.3 | WP plugin + live demo |
| v1.0 | Persistent storage + admin UI + webhooks |

---

## What's Done

| # | Feature | Notes |
|---|---------|-------|
| ✅ | Multi-provider AI (OpenAI / Claude / Gemini) | Switch via env var |
| ✅ | Streaming SSE responses | Token-by-token via `/api/chat/stream` |
| ✅ | Conversation session management | In-memory store, session IDs |
| ✅ | Multi-tenant API keys | Per-tenant config overrides |
| ✅ | API key security hardening | scrypt, timing-safe compare, 256-bit entropy |
| ✅ | CI + streaming tests | GitHub Actions, Vitest |
| ✅ | Embed widget (`widget.js` + `widget.css`) | `<script>` tag drop-in, floating chat bubble |
| ✅ | WordPress plugin (`chatbot-drop-wp`) | PHP plugin, shortcode, settings page — code done, not published to WP.org |
| ✅ | GitHub Pages demo + docs | `https://devtony42.github.io/chatbot-drop/` |
| ✅ | render.yaml one-click deploy | In repo, ready to use |

---

## Backlog (Prioritized)

---

### 🔴 P0 — Blockers (do these first)

#### 1. Live Demo Deployment on Render
**Why:** The Upwork listing is drafted and ready — this is the only thing blocking it from going live. No demo = no credibility for a $199–$799 gig.

- Deploy chatbot-drop backend to Render using existing `render.yaml`
- Set env vars: provider, API key, `ADMIN_API_KEY`, CORS origin
- Create a public read-only demo tenant with pre-seeded API key
- Update `demo.html` to point at the live Render URL (not localhost)
- Update README deploy badges + demo link
- Update Upwork listing draft + blog post with the live URL

**Effort:** < 1 day (mostly env config + clicking deploy)
**Branch:** `feat/live-demo`

---

### 🟠 P1 — Ship for v0.3 (needed before Upwork gigs start)

#### 2. WP Plugin — README + Zip Package
**Why:** The PHP code is done (`chatbot-drop-wp/`), but there's no README and no installable `.zip`. Clients expect to download and install a zip, not clone a repo.

- Write `chatbot-drop-wp/README.md` — install steps, shortcode reference, FAQ
- Add `Makefile` or `scripts/package-wp-plugin.sh` to zip the plugin for distribution
- Add a "Download WP Plugin" link to the main README
- Optional: submit to WP.org plugin directory (longer process, not urgent)

**Effort:** 2–3 hours
**Branch:** `feat/wp-plugin-packaging`

#### 3. Rate Limiting Per Tenant
**Why:** Without it, a single bad tenant can flood the AI provider and run up everyone's API bill. Critical before any real client deployments.

- Add per-tenant `rate_limit` config field (messages/hour, default: 100)
- Middleware reads tenant config and enforces the limit
- Return `429 Too Many Requests` with a `Retry-After` header
- Tests: tenant at limit, tenant with custom limit, default fallback

**Effort:** 1 day
**Branch:** `feat/per-tenant-rate-limiting`

#### 4. Custom CSS Theming via Shortcode / Widget Config
**Why:** Every client wants their brand colors. Currently it requires editing the CSS file. This is a common ask in Upwork chatbot gigs.

- Support `data-color`, `data-radius`, `data-font-size` attributes on the widget embed
- Shortcode attributes pass through as CSS vars: `primary_color`, `border_radius`
- Apply as scoped CSS custom properties on `.acw-container`
- Document in README widget config table

**Effort:** 0.5 day
**Branch:** `feat/widget-theming`

---

### 🟡 P2 — v1.0 Features (unlock the Pro tier)

#### 5. Persistent Conversation Storage (PostgreSQL)
**Why:** Currently in-memory — a server restart wipes all history. Required for the $799 Pro package. Clients paying for a "production" chatbot expect logs to survive deploys.

- Replace in-memory `SessionStore` with PostgreSQL-backed store
- Schema: `conversations(id, tenant_id, session_id, messages jsonb, created_at, updated_at)`
- Optional TTL: prune conversations older than N days (configurable)
- Zero breaking API changes — same session ID interface
- Migration script for fresh installs

**Effort:** 1–3 days
**Branch:** `feat/persistent-storage`

#### 6. Webhook / Callback Support
**Why:** Zapier/Make/n8n compatibility is a recurring ask in chatbot gigs. Unlocks lead capture, CRM sync, and notification pipelines without custom integrations.

- Per-tenant `webhook_url` config field
- Events: `message.received`, `message.sent`, `session.started`, `session.ended`
- Payload: tenant ID, session ID, message content, timestamp
- Retry on failure (3x with exponential backoff)
- Included in Pro tier ($799), documented as an upsell from Standard

**Effort:** 1–2 days
**Branch:** `feat/webhooks`

#### 7. Admin Dashboard UI
**Why:** Tenant management is API-only right now. A UI makes this hand-offable to non-technical clients and is a visual differentiator in the Upwork listing.

- React SPA served at `/admin`
- Login with `ADMIN_API_KEY`
- Tenant list: create, view, rotate API key, delete
- Per-tenant usage stats: message count, last active
- Branding overrides per tenant (title, greeting, color)
- Include a basic conversation log view per tenant

**Effort:** 2–3 days
**Branch:** `feat/admin-dashboard`

---

### 🟢 P3 — Ideas Parking Lot (future / evaluate when ready)

- **`npx chatbot-drop init` CLI scaffolder** — guided setup, generates `.env`, `render.yaml`, first tenant
- **Slack / Discord channel integration** — reply in thread, not just browser widget; different market (internal tooling)
- **WhatsApp Cloud API backend** — full Pattern #2 product ($800–1.5K positioning); separate repo (`whatsapp-business-bot`)
- **WP.org plugin directory submission** — longer process, but good for organic discovery
- **Multi-language widget** — `lang` config attribute, template-based responses

---

## Content & Marketing (non-code)

| Item | Status | Notes |
|------|--------|-------|
| Upwork listing draft | ✅ Done | Needs live demo URL before publishing |
| Blog post draft | ✅ Done | Needs live demo URL before publishing |
| Catalog listing (chooseyourownapp.com) | ✅ Done | Needs live demo URL before publishing |
| Demo video (screen recording) | ⏳ Blocked | Do after live demo is up |
| WP.org plugin submission | 💤 Parked | P3 — not urgent |
