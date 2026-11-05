import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = "REQUEST_FAILED",
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export function asyncHandler(handler: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new ApiError(404, "Route not found.", "NOT_FOUND"));
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof ApiError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_FAILED",
        message: "The request is invalid.",
        details: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      },
    });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2034") {
      res.status(409).json({ error: { code: "CONCURRENT_MODIFICATION", message: "The record changed concurrently. Retry the request." } });
      return;
    }
    if (error.code === "P2025") {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Record not found." } });
      return;
    }
    if (error.code === "P2002") {
      res.status(409).json({ error: { code: "CONFLICT", message: "A record with those unique values already exists." } });
      return;
    }
  }
  if (isErrorCode(error, "entity.too.large")) {
    res.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "The request body exceeds the 256 KB limit." } });
    return;
  }
  if (isErrorCode(error, "entity.parse.failed")) {
    res.status(400).json({ error: { code: "INVALID_JSON", message: "The request body must contain valid JSON." } });
    return;
  }
  console.error("Unhandled API error.", error);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected server error occurred." } });
};

function isErrorCode(error: unknown, code: string): boolean {
  return Boolean(error && typeof error === "object" && "type" in error && error.type === code);
}
