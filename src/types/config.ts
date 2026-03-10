import { z } from "zod";

export const ServerConfigSchema = z.object({
  port: z.number().int().min(1).max(65535).default(3000),
  host: z.string().default("0.0.0.0"),
  corsOrigins: z.array(z.string()).default(["*"]),
  rateLimitWindowMs: z.number().int().positive().default(60_000),
  rateLimitMaxRequests: z.number().int().positive().default(20),
});

export const ProviderConfigSchema = z.object({
  default: z.enum(["openai", "anthropic", "google"]).default("openai"),
  openai: z
    .object({
      apiKey: z.string().min(1),
      model: z.string().default("gpt-4o-mini"),
    })
    .optional(),
  anthropic: z
    .object({
      apiKey: z.string().min(1),
      model: z.string().default("claude-sonnet-4-20250514"),
    })
    .optional(),
  google: z
    .object({
      apiKey: z.string().min(1),
      model: z.string().default("gemini-2.0-flash"),
    })
    .optional(),
});

export const AppConfigSchema = z.object({
  server: ServerConfigSchema.default({}),
  providers: ProviderConfigSchema,
  systemPrompt: z
    .string()
    .default("You are a helpful assistant. Be concise and friendly."),
  maxTokens: z.number().int().positive().default(1024),
  temperature: z.number().min(0).max(2).default(0.7),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;
