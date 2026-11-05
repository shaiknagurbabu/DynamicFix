import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { ApiError, asyncHandler } from "./errors.js";

export const authenticate: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = req.header("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new ApiError(401, "A bearer token is required.", "UNAUTHENTICATED");

  let subject: string;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    subject = typeof payload === "string" ? "" : payload.sub ?? "";
  } catch {
    throw new ApiError(401, "The access token is invalid or expired.", "UNAUTHENTICATED");
  }
  if (!subject) throw new ApiError(401, "The access token is invalid.", "UNAUTHENTICATED");

  const user = await prisma.user.findUnique({
    where: { id: subject },
    include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
  });
  if (!user || user.status !== "ACTIVE") throw new ApiError(401, "The account is inactive or no longer exists.", "UNAUTHENTICATED");

  req.auth = {
    userId: user.id,
    email: user.email,
    name: user.name,
    roleKeys: user.roles.map(({ role }) => role.key),
    permissionKeys: [...new Set(user.roles.flatMap(({ role }) => role.permissions.map(({ permission }) => permission.key)))],
  };
  next();
});

export function requirePermission(permissionKey: string): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(new ApiError(401, "Authentication is required.", "UNAUTHENTICATED"));
      return;
    }
    if (req.auth.permissionKeys.includes("*") || req.auth.permissionKeys.includes(permissionKey)) {
      next();
      return;
    }
    next(new ApiError(403, "You do not have permission to perform this action.", "FORBIDDEN"));
  };
}
