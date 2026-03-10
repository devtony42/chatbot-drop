# Build Guide

## Prerequisites

- **Node.js** ≥ 20.0.0 ([download](https://nodejs.org))
- **npm** (included with Node.js)
- At least one AI provider API key:
  - [OpenAI](https://platform.openai.com/api-keys)
  - [Anthropic](https://console.anthropic.com/settings/keys)
  - [Google AI Studio](https://aistudio.google.com/apikey)

## Install

```bash
npm install
```

## Configure

```bash
cp .env.example .env
```

Edit `.env` and add your API key(s). Only the provider you want to use needs a key.

## Development

```bash
npm run dev          # Start with hot reload (tsx watch)
```

Server runs at `http://localhost:3000` by default.

## Production Build

```bash
npm run build        # Compile TypeScript → dist/
npm start            # Run compiled output
```

## Testing

```bash
npm test             # Run all tests once
npm run test:watch   # Watch mode (re-runs on save)
npm run test:coverage # Generate coverage report
```

## Linting & Formatting

```bash
npm run lint         # ESLint check
npm run format       # Prettier auto-format
```

## Dependencies

### Runtime

| Package | Purpose |
|---------|---------|
| `express` | HTTP server and routing |
| `cors` | Cross-Origin Resource Sharing |
| `helmet` | Security headers |
| `express-rate-limit` | Request rate limiting |
| `zod` | Runtime input validation and schema definition |

### Dev

| Package | Purpose |
|---------|---------|
| `typescript` | Type-safe JavaScript |
| `tsx` | TypeScript execution with watch mode |
| `vitest` | Fast unit and integration testing |
| `@vitest/coverage-v8` | Code coverage via V8 |
| `supertest` | HTTP assertion library for integration tests |
| `eslint` | Code linting |
| `prettier` | Code formatting |

Zero native dependencies. No build tools beyond TypeScript. Runs anywhere Node runs.

## Docker (Optional)

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist/ dist/
COPY public/ public/
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```bash
npm run build
docker build -t chatbot-starter .
docker run -p 3000:3000 --env-file .env chatbot-starter
```
