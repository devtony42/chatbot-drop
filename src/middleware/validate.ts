import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

/**
 * Express middleware factory that validates request body against a Zod schema.
 * Returns 400 with structured errors on validation failure.
 */
export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));

      res.status(400).json({ error: "Validation failed", details: errors });
      return;
    }

    req.body = result.data;
    next();
  };
}
