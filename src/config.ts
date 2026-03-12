import { AppConfigSchema } from "./types/index.js";
import type { AppConfig } from "./types/index.js";

/**
 * Loads configuration from environment variables.
 * Validates with Zod and fails fast on invalid config.
 */
export function loadConfig(): AppConfig {
  const raw = {
    server: {
      port: intOrUndefined(process.env.PORT),
      host: process.env.HOST,
      corsOrigins: process.env.CORS_ORIGINS?.split(",").map((s) => s.trim()),
      rateLimitWindowMs: intOrUndefined(process.env.RATE_LIMIT_WINDOW_MS),
      rateLimitMaxRequests: intOrUndefined(process.env.RATE_LIMIT_MAX),
      adminApiKey: process.env.ADMIN_API_KEY,
    },
    providers: {
      default: process.env.DEFAULT_PROVIDER,
      openai: process.env.OPENAI_API_KEY
        ? {
            apiKey: process.env.OPENAI_API_KEY,
            model: process.env.OPENAI_MODEL,
          }
        : undefined,
      anthropic: process.env.ANTHROPIC_API_KEY
        ? {
            apiKey: process.env.ANTHROPIC_API_KEY,
            model: process.env.ANTHROPIC_MODEL,
          }
        : undefined,
      google: process.env.GOOGLE_API_KEY
        ? {
            apiKey: process.env.GOOGLE_API_KEY,
            model: process.env.GOOGLE_MODEL,
          }
        : undefined,
    },
    systemPrompt: process.env.SYSTEM_PROMPT,
    maxTokens: intOrUndefined(process.env.MAX_TOKENS),
    temperature: floatOrUndefined(process.env.TEMPERATURE),
  };

  return AppConfigSchema.parse(raw);
}

function intOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? undefined : parsed;
}

function floatOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? undefined : parsed;
}
