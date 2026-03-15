import { describe, it, expect } from "vitest";
import { TenantStore, TenantNotFoundError } from "../../src/services/tenant-store.js";

describe("TenantStore", () => {
  describe("create", () => {
    it("should create a tenant with a hashed API key and return the raw key", () => {
      const store = new TenantStore();
      const { tenant, rawApiKey } = store.create({ name: "Acme Corp" });

      expect(tenant.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(rawApiKey).toMatch(/^[A-Za-z0-9_-]{43}$/); // base64url, 256-bit
      expect(tenant.apiKey).not.toBe(rawApiKey);
      expect(tenant.apiKey).toMatch(/^[0-9a-f]{64}:[0-9a-f]{128}$/); // scrypt salt:hash
      expect(tenant.name).toBe("Acme Corp");
      expect(tenant.createdAt).toBeGreaterThan(0);
    });

    it("should store optional config overrides", () => {
      const store = new TenantStore();
      const { tenant } = store.create({
        name: "Test Tenant",
        systemPrompt: "Be brief.",
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        maxTokens: 2048,
        temperature: 0.3,
      });

      expect(tenant.systemPrompt).toBe("Be brief.");
      expect(tenant.provider).toBe("anthropic");
      expect(tenant.model).toBe("claude-sonnet-4-20250514");
      expect(tenant.maxTokens).toBe(2048);
      expect(tenant.temperature).toBe(0.3);
    });
  });

  describe("findByApiKey", () => {
    it("should find a tenant by raw API key", () => {
      const store = new TenantStore();
      const { tenant, rawApiKey } = store.create({ name: "Findable" });

      const found = store.findByApiKey(rawApiKey);
      expect(found?.id).toBe(tenant.id);
      expect(found?.name).toBe("Findable");
    });

    it("should return undefined for unknown API keys", () => {
      const store = new TenantStore();
      store.create({ name: "Existing" });

      expect(store.findByApiKey("nonexistent-key")).toBeUndefined();
    });
  });

  describe("get", () => {
    it("should return a tenant by id", () => {
      const store = new TenantStore();
      const { tenant } = store.create({ name: "By ID" });

      const found = store.get(tenant.id);
      expect(found?.name).toBe("By ID");
    });

    it("should return undefined for unknown ids", () => {
      const store = new TenantStore();
      expect(store.get("nonexistent-id")).toBeUndefined();
    });
  });

  describe("list", () => {
    it("should return all tenants", () => {
      const store = new TenantStore();
      store.create({ name: "Tenant A" });
      store.create({ name: "Tenant B" });

      const tenants = store.list();
      expect(tenants).toHaveLength(2);
      expect(tenants.map((t) => t.name).sort()).toEqual([
        "Tenant A",
        "Tenant B",
      ]);
    });

    it("should return empty array when no tenants exist", () => {
      const store = new TenantStore();
      expect(store.list()).toEqual([]);
    });
  });

  describe("delete", () => {
    it("should remove a tenant and invalidate its API key", () => {
      const store = new TenantStore();
      const { tenant, rawApiKey } = store.create({ name: "Deletable" });

      expect(store.delete(tenant.id)).toBe(true);
      expect(store.get(tenant.id)).toBeUndefined();
      expect(store.findByApiKey(rawApiKey)).toBeUndefined();
    });

    it("should return false for unknown tenant ids", () => {
      const store = new TenantStore();
      expect(store.delete("nonexistent-id")).toBe(false);
    });
  });

  describe("TenantNotFoundError", () => {
    it("should have correct name and message", () => {
      const error = new TenantNotFoundError("abc-123");
      expect(error.name).toBe("TenantNotFoundError");
      expect(error.message).toBe('Tenant "abc-123" not found');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
