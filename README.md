# 🤖 Agentic Chatbot Starter

Drop-in AI chatbot widget with multi-provider support. Embed in any website in under 5 minutes.

## Features

- **Multi-provider** — OpenAI, Anthropic (Claude), and Google Gemini. Switch providers with one env var.
- **Streaming** — Real-time Server-Sent Events for token-by-token responses.
- **Embeddable widget** — One `<script>` tag. No build step. Fully customizable CSS.
- **Production ready** — Rate limiting, CORS, Helmet security headers, Zod input validation.
- **Type-safe** — Written in TypeScript with strict mode.
- **Tested** — Unit and integration tests with Vitest.
- **Clean architecture** — Routes → Controllers → Services → Providers. Easy to extend.

## Quick Start

```bash
# Clone
git clone https://github.com/chooseyourownapp/agentic-chatbot-starter.git
cd agentic-chatbot-starter

# Install
npm install

# Configure
cp .env.example .env
# Edit .env with your API key(s)

# Run
npm run dev
```

Open `http://localhost:3000` to see the demo page with the embedded chat widget.

## Architecture

```
src/
├── types/           # TypeScript interfaces and Zod schemas
├── providers/       # AI provider implementations (OpenAI, Anthropic, Google)
├── services/        # Business logic (ProviderRegistry, ChatService)
├── controllers/     # HTTP request handlers
├── routes/          # Express route definitions
├── middleware/       # Rate limiting, validation, error handling
├── config.ts        # Environment variable loader
├── app.ts           # Express app factory
└── index.ts         # Entry point

public/
├── index.html       # Demo page
├── css/widget.css   # Widget styles
└── js/widget.js     # Embeddable widget (vanilla JS)

test/
├── unit/            # Unit tests
└── integration/     # API integration tests
```

## API Reference

### `POST /api/chat`

Send a message and receive a complete response.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "What is TypeScript?" }
  ],
  "provider": "openai"
}
```

**Response:**
```json
{
  "content": "TypeScript is a typed superset of JavaScript...",
  "provider": "openai",
  "model": "gpt-4o-mini",
  "usage": {
    "promptTokens": 12,
    "completionTokens": 45,
    "totalTokens": 57
  }
}
```

### `POST /api/chat/stream`

Same request format as `/api/chat`, returns Server-Sent Events:

```
data: {"content":"Type","done":false}
data: {"content":"Script","done":false}
data: {"content":"","done":true}
```

### `GET /api/chat/providers`

List configured providers.

```json
{ "providers": ["openai", "anthropic", "google"] }
```

### `GET /api/health`

Health check with provider status.

```json
{
  "status": "ok",
  "timestamp": "2026-03-10T14:00:00.000Z",
  "providers": ["openai"]
}
```

## Embedding the Widget

Add this to any HTML page:

```html
<script src="https://your-server.com/js/widget.js"
        data-server="https://your-server.com"
        data-title="Chat with us"
        data-greeting="Hi! How can I help?"
        data-stream="true">
</script>
```

### Widget Options

| Attribute | Default | Description |
|-----------|---------|-------------|
| `data-server` | `""` (same origin) | Backend server URL |
| `data-title` | `"Chat"` | Header title text |
| `data-greeting` | `"Hi! How can I help you today?"` | Initial greeting message |
| `data-stream` | `"true"` | Enable streaming responses |

### Customizing Styles

The widget uses CSS custom properties scoped to `.acw-container`. Override them in your stylesheet:

```css
.acw-container {
  --acw-primary: #7c3aed;      /* Purple theme */
  --acw-primary-hover: #6d28d9;
  --acw-radius: 8px;            /* Less rounded */
}
```

## Configuration

All configuration via environment variables (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins |
| `DEFAULT_PROVIDER` | `openai` | Default AI provider |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `ANTHROPIC_API_KEY` | — | Anthropic API key |
| `GOOGLE_API_KEY` | — | Google Gemini API key |
| `SYSTEM_PROMPT` | `"You are a helpful assistant..."` | System prompt for all conversations |
| `MAX_TOKENS` | `1024` | Maximum response tokens |
| `TEMPERATURE` | `0.7` | Response randomness (0-2) |
| `RATE_LIMIT_MAX` | `20` | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (ms) |

## Adding a New Provider

1. Create `src/providers/your-provider.ts` implementing the `ChatProvider` interface
2. Register it in `src/services/provider-registry.ts`
3. Add its config to `src/types/config.ts`
4. Add env vars to `src/config.ts` and `.env.example`
5. Write tests in `test/unit/`

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

## License

MIT — use it however you want.

## Author

**Tony Goggin** — [chooseyourownapp.com](https://chooseyourownapp.com)
