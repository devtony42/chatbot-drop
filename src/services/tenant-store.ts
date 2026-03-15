import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Tenant } from "../types/index.js";
import type { z } from "zod";
import type { CreateTenantSchema } from "../types/tenant.js";

/**
 * In-memory tenant store for multi-tenant API key management.
 * Stores scrypt-hashed API keys — raw keys are only returned once at creation time.
 */
export class TenantStore {
  private readonly tenants = new Map<string, Tenant>();

  private readonly SALT_LENGTH = 32;
  private readonly KEY_LENGTH = 64;
  private readonly SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };

  create(
    data: z.infer<typeof CreateTenantSchema>,
  ): { tenant: Tenant; rawApiKey: string } {
    const rawApiKey = randomBytes(32).toString("base64url");
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

    return { tenant, rawApiKey };
  }

  findByApiKey(rawKey: string): Tenant | undefined {
    for (const tenant of this.tenants.values()) {
      if (this.verifyKey(rawKey, tenant.apiKey)) {
        return tenant;
      }
    }
    return undefined;
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

    this.tenants.delete(id);
    return true;
  }

  private hashKey(raw: string): string {
    const salt = randomBytes(this.SALT_LENGTH);
    const hash = scryptSync(raw, salt, this.KEY_LENGTH, this.SCRYPT_PARAMS);
    return `${salt.toString("hex")}:${hash.toString("hex")}`;
  }

  private verifyKey(raw: string, stored: string): boolean {
    const [saltHex, hashHex] = stored.split(":");
    const salt = Buffer.from(saltHex, "hex");
    const storedHash = Buffer.from(hashHex, "hex");
    const derived = scryptSync(raw, salt, this.KEY_LENGTH, this.SCRYPT_PARAMS);
    return timingSafeEqual(derived, storedHash);
  }
}

export class TenantNotFoundError extends Error {
  constructor(id: string) {
    super(`Tenant "${id}" not found`);
    this.name = "TenantNotFoundError";
  }
}
