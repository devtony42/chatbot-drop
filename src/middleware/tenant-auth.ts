import type { Request, Response, NextFunction } from "express";
import type { Tenant } from "../types/index.js";
import type { TenantStore } from "../services/tenant-store.js";

declare module "express-serve-static-core" {
  interface Request {
    tenant?: Tenant;
  }
}

/**
 * Middleware that authenticates requests via the `x-api-key` header.
 * Attaches the matching Tenant to `req.tenant` on success.
 */
export function createTenantAuth(tenantStore: TenantStore) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey || typeof apiKey !== "string") {
      next();
      return;
    }

    const tenant = tenantStore.findByApiKey(apiKey);

    if (!tenant) {
      res.status(401).json({ error: "Invalid API key" });
      return;
    }

    req.tenant = tenant;
    next();
  };
}

/**
 * Middleware that protects admin routes with the ADMIN_API_KEY.
 */
export function createAdminAuth(adminApiKey: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey || apiKey !== adminApiKey) {
      res.status(401).json({ error: "Invalid admin API key" });
      return;
    }

    next();
  };
}
