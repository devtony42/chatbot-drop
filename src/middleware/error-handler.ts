import type { Request, Response, NextFunction } from "express";

interface HttpError extends Error {
  status?: number;
  statusCode?: number;
  type?: string;
}

export function errorHandler(
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.status ?? err.statusCode ?? resolveStatusCode(err);

  console.error(`[error] ${err.message}`);

  res.status(statusCode).json({
    error: err.message || "Internal server error",
  });
}

function resolveStatusCode(err: Error): number {
  if (err.message.includes("API error")) return 502;
  return 500;
}
