import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { validate } from "../../src/middleware/validate.js";
import type { Request, Response, NextFunction } from "express";

function createMockReqRes(body: unknown) {
  const req = { body } as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe("validate middleware", () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  });

  it("should call next() on valid input", () => {
    const { req, res, next } = createMockReqRes({ name: "Ada", age: 1 });
    validate(schema)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ name: "Ada", age: 1 });
  });

  it("should return 400 with errors on invalid input", () => {
    const { req, res, next } = createMockReqRes({ name: "", age: -5 });
    validate(schema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Validation failed" }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 400 when required fields are missing", () => {
    const { req, res, next } = createMockReqRes({});
    validate(schema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("should include field paths in error details", () => {
    const { req, res, next } = createMockReqRes({ name: 123 });
    validate(schema)(req, res, next);

    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "name" }),
      ]),
    );
  });
});
