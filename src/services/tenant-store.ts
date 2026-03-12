import { randomUUID, createHash } from "node:crypto";
import type { Tenant } from "../types/index.js";
import type { z } from "zod";
import type { CreateTenantSchema } from "../types/tenant.js";

/**
 * In-memory tenant store for multi-tenant API key management.
 * Stores hashed API keys — raw keys are only returned once at creation time.
 */
export class TenantStore {
  private readonly tenants = new Map<string, Tenant>();
  private readonly keyIndex = new Map<string, string>();

  create(
    data: z.infer<typeof CreateTenantSchema>,
  ): { tenant: Tenant; rawApiKey: string } {
    const rawApiKey = randomUUID();
    const hashedKey = this.hashKey(rawApiKey);

    const tenant: Tenant = {
      id: randomUUID(),
      apiKey: hashedKey,
      name: data.name,
      systemPrompt: data.systemPrompt,
      provider: data.provider,
      model: data.model,
      maxTokens: data.maxTokens,
      temperature: data.temperature,
      createdAt: Date.now(),
    };

    this.tenants.set(tenant.id, tenant);
    this.keyIndex.set(hashedKey, tenant.id);

    return { tenant, rawApiKey };
  }

  findByApiKey(rawKey: string): Tenant | undefined {
    const hashedKey = this.hashKey(rawKey);
    const tenantId = this.keyIndex.get(hashedKey);
    if (!tenantId) return undefined;
    return this.tenants.get(tenantId);
  }

  get(id: string): Tenant | undefined {
    return this.tenants.get(id);
  }

  list(): Tenant[] {
    return Array.from(this.tenants.values());
  }

  delete(id: string): boolean {
    const tenant = this.tenants.get(id);
    if (!tenant) return false;

    this.keyIndex.delete(tenant.apiKey);
    this.tenants.delete(id);
    return true;
  }

  private hashKey(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
  }
}

export class TenantNotFoundError extends Error {
  constructor(id: string) {
    super(`Tenant "${id}" not found`);
    this.name = "TenantNotFoundError";
  }
}
