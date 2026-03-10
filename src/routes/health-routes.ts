import { Router } from "express";
import type { ProviderRegistry } from "../services/provider-registry.js";

/**
 * Health check routes.
 *
 * GET /api/health — Service health + provider availability
 */
export function createHealthRoutes(registry: ProviderRegistry): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      providers: registry.listAvailable(),
    });
  });

  return router;
}
