import { Router } from "express";
import type { Request, Response } from "express";
import { validate } from "../middleware/validate.js";
import { createAdminAuth } from "../middleware/tenant-auth.js";
import { CreateTenantSchema } from "../types/tenant.js";
import type { TenantStore } from "../services/tenant-store.js";

/**
 * Tenant admin CRUD routes.
 * All routes are protected by the ADMIN_API_KEY.
 *
 * POST   /tenants      — Create a new tenant (returns raw API key once)
 * GET    /tenants       — List all tenants
 * GET    /tenants/:id   — Get a single tenant
 * DELETE /tenants/:id   — Delete a tenant
 */
export function createTenantRoutes(
  tenantStore: TenantStore,
  adminApiKey: string,
): Router {
  const router = Router();

  router.use(createAdminAuth(adminApiKey));

  router.post(
    "/",
    validate(CreateTenantSchema),
    (req: Request, res: Response): void => {
      const { tenant, rawApiKey } = tenantStore.create(req.body);

      res.status(201).json({
        id: tenant.id,
        name: tenant.name,
        apiKey: rawApiKey,
        createdAt: new Date(tenant.createdAt).toISOString(),
      });
    },
  );

  router.get("/", (_req: Request, res: Response): void => {
    const tenants = tenantStore.list().map((t) => ({
      id: t.id,
      name: t.name,
      provider: t.provider,
      model: t.model,
      createdAt: new Date(t.createdAt).toISOString(),
    }));

    res.json({ tenants });
  });

  router.get("/:id", (req: Request, res: Response): void => {
    const tenant = tenantStore.get(req.params.id as string);

    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    res.json({
      id: tenant.id,
      name: tenant.name,
      systemPrompt: tenant.systemPrompt,
      provider: tenant.provider,
      model: tenant.model,
      maxTokens: tenant.maxTokens,
      temperature: tenant.temperature,
      createdAt: new Date(tenant.createdAt).toISOString(),
    });
  });

  router.delete("/:id", (req: Request, res: Response): void => {
    const deleted = tenantStore.delete(req.params.id as string);

    if (!deleted) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    res.status(204).end();
  });

  return router;
}
