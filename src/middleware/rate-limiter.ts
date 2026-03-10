import rateLimit from "express-rate-limit";
import type { ServerConfig } from "../types/index.js";

export function createRateLimiter(config: ServerConfig) {
  return rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMaxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many requests. Please try again later.",
    },
  });
}
