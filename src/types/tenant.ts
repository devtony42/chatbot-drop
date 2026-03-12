import { z } from "zod";

export interface Tenant {
  id: string;
  apiKey: string;
  name: string;
  systemPrompt?: string;
  provider?: "openai" | "anthropic" | "google";
  model?: string;
  maxTokens?: number;
  temperature?: number;
  createdAt: number;
}

export const CreateTenantSchema = z.object({
  name: z.string().min(1).max(100),
  systemPrompt: z.string().max(4000).optional(),
  provider: z.enum(["openai", "anthropic", "google"]).optional(),
  model: z.string().max(100).optional(),
  maxTokens: z.number().int().positive().max(32000).optional(),
  temperature: z.number().min(0).max(2).optional(),
});
