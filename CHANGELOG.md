# Changelog

## [0.3.0] — 2026-03-20

### Added
- `scripts/package-wp-plugin.sh` — builds a distributable `.zip` of the WordPress plugin; auto-reads version from plugin header
- WordPress plugin section in main README with download link and build instructions
- `chatbot-drop-wp/README.md` — full install steps, shortcode reference, and usage examples

## [0.2.0] — 2026-03-12

### Added
- Multi-tenant support with per-tenant API keys and config overrides
- Tenant CRUD admin routes (`POST/GET/DELETE /api/tenants`) protected by `ADMIN_API_KEY`
- Tenant auth middleware — reads `x-api-key` header to identify tenants
- Per-tenant `systemPrompt`, `provider`, `model`, `maxTokens`, `temperature` overrides
- `tenantId` tracking on sessions for tenant-scoped conversations
- `data-api-key` attribute on the embeddable widget for tenant identification
- SHA-256 hashed API key storage (raw key shown once at creation)
- `TenantStore` in-memory store with create, findByApiKey, get, list, delete
- Unit tests for `TenantStore`
- `ADMIN_API_KEY` environment variable for admin route protection

## [0.1.0] — 2026-03-10

### Added
- Multi-provider support (OpenAI, Anthropic, Google Gemini)
- Streaming responses via Server-Sent Events
- Embeddable chat widget (vanilla JS, no dependencies)
- Rate limiting, CORS, Helmet security headers
- Zod input validation on all endpoints
- Unit tests for services, config, and middleware
- Integration tests for all API endpoints
- Demo page with embedded widget
- Environment-based configuration
- TypeScript with strict mode
