import { Router } from "express";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { modules } from "../../../shared/modules.js";
import { prisma } from "../db/prisma.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { ApiError, asyncHandler } from "../middleware/errors.js";

const router = Router();
const emailSchema = z.string().trim().email().max(254).transform((email) => email.toLowerCase());
const createUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: emailSchema,
  password: z.string().min(12).max(256),
  roleKeys: z.array(z.string().min(1).max(64)).min(1).max(32),
}).strict();
const roleSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9-]{1,63}$/),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  permissions: z.array(z.string().min(1).max(128)).max(200).default([]),
}).strict();
const updatePermissionsSchema = z.object({
  permissions: z.array(z.string().min(1).max(128)).max(200),
}).strict();
const statusSchema = z.object({ status: z.enum(["ACTIVE", "DISABLED"]) }).strict();
const userRolesSchema = z.object({ roleKeys: z.array(z.string().min(1).max(64)).min(1).max(32) }).strict();

router.use(authenticate, requirePermission("access:manage"));

router.get("/users", asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, status: true, createdAt: true, updatedAt: true,
      roles: { select: { role: { select: { id: true, key: true, name: true } } } },
    },
  });
  res.json({ users: users.map(({ roles, ...user }) => ({ ...user, roles: roles.map(({ role }) => role) })) });
}));

router.post("/users", asyncHandler(async (req, res) => {
  const input = createUserSchema.parse(req.body);
  if (input.roleKeys.includes("administrator") && !req.auth!.permissionKeys.includes("*")) {
    throw new ApiError(403, "Only a full administrator can assign the administrator role.", "FORBIDDEN");
  }
  const roles = await prisma.role.findMany({ where: { key: { in: input.roleKeys } } });
  if (roles.length !== new Set(input.roleKeys).size) throw new ApiError(400, "One or more role keys are invalid.", "VALIDATION_FAILED");
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.$transaction(async (transaction) => {
    const created = await transaction.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
      },
    });
    await transaction.userRole.createMany({
      data: roles.map((role) => ({ userId: created.id, roleId: role.id })),
    });
    await transaction.auditLog.create({
      data: { userId: req.auth!.userId, action: "CREATE_USER", moduleId: "users", recordId: created.id, changes: { roleKeys: roles.map((role) => role.key) } },
    });
    return created;
  });
  res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, status: user.status, createdAt: user.createdAt } });
}));

router.patch("/users/:userId/status", asyncHandler(async (req, res) => {
  const { status } = statusSchema.parse(req.body);
  if (req.params.userId === req.auth!.userId && status !== "ACTIVE") {
    throw new ApiError(400, "You cannot disable your own account.", "SELF_DISABLE_NOT_ALLOWED");
  }
  const updated = await prisma.$transaction(async (transaction) => {
    const current = await transaction.user.findUnique({
      where: { id: req.params.userId },
      include: { roles: { include: { role: true } } },
    });
    if (!current) throw new ApiError(404, "User not found.", "NOT_FOUND");
    const isAdministrator = current.roles.some(({ role }) => role.key === "administrator");
    if (isAdministrator && status !== "ACTIVE") {
      const activeAdmins = await transaction.user.count({
        where: { status: "ACTIVE", roles: { some: { role: { key: "administrator" } } } },
      });
      if (activeAdmins <= 1) throw new ApiError(409, "The last active administrator cannot be disabled.", "LAST_ADMINISTRATOR");
    }
    const user = await transaction.user.update({ where: { id: current.id }, data: { status } });
    await transaction.auditLog.create({
      data: { userId: req.auth!.userId, action: "UPDATE_USER_STATUS", moduleId: "users", recordId: user.id, changes: { status } },
    });
    return user;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  res.json({ user: { id: updated.id, name: updated.name, email: updated.email, status: updated.status } });
}));

router.put("/users/:userId/roles", asyncHandler(async (req, res) => {
  const { roleKeys } = userRolesSchema.parse(req.body);
  if (roleKeys.includes("administrator") && !req.auth!.permissionKeys.includes("*")) {
    throw new ApiError(403, "Only a full administrator can assign the administrator role.", "FORBIDDEN");
  }
  const roles = await prisma.role.findMany({ where: { key: { in: roleKeys } } });
  if (roles.length !== new Set(roleKeys).size) throw new ApiError(400, "One or more role keys are invalid.", "VALIDATION_FAILED");
  if (req.params.userId === req.auth!.userId && !roles.some((role) => role.key === "administrator")) {
    throw new ApiError(400, "You cannot remove your own administrator role.", "SELF_ROLE_CHANGE_NOT_ALLOWED");
  }

  const updated = await prisma.$transaction(async (transaction) => {
    const current = await transaction.user.findUnique({
      where: { id: req.params.userId },
      include: { roles: { include: { role: true } } },
    });
    if (!current) throw new ApiError(404, "User not found.", "NOT_FOUND");
    const willRemoveAdministrator = current.roles.some(({ role }) => role.key === "administrator") &&
      !roles.some((role) => role.key === "administrator");
    if (willRemoveAdministrator && current.status === "ACTIVE") {
      const otherActiveAdmins = await transaction.user.count({
        where: { id: { not: current.id }, status: "ACTIVE", roles: { some: { role: { key: "administrator" } } } },
      });
      if (otherActiveAdmins === 0) throw new ApiError(409, "The last active administrator must retain its role.", "LAST_ADMINISTRATOR");
    }
    await transaction.userRole.deleteMany({ where: { userId: current.id } });
    await transaction.userRole.createMany({ data: roles.map((role) => ({ userId: current.id, roleId: role.id })) });
    await transaction.auditLog.create({
      data: { userId: req.auth!.userId, action: "UPDATE_USER_ROLES", moduleId: "users", recordId: current.id, changes: { roleKeys: roles.map((role) => role.key) } },
    });
    return current;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  res.json({ userId: updated.id, roleKeys: roles.map((role) => role.key) });
}));

router.get("/roles", asyncHandler(async (_req, res) => {
  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    include: { permissions: { include: { permission: true } } },
  });
  res.json({
    roles: roles.map(({ permissions, ...role }) => ({
      ...role,
      permissions: permissions.map(({ permission }) => permission.key),
    })),
  });
}));

router.post("/roles", asyncHandler(async (req, res) => {
  const input = roleSchema.parse(req.body);
  assertValidPermissionKeys(input.permissions);
  if (input.permissions.includes("*") && !req.auth!.permissionKeys.includes("*")) {
    throw new ApiError(403, "Only a full administrator can grant wildcard access.", "FORBIDDEN");
  }
  const role = await prisma.$transaction(async (transaction) => {
    const created = await transaction.role.create({
      data: {
        key: input.key,
        name: input.name,
        description: input.description,
      },
    });
    const relations = await connectPermissions(transaction, input.permissions);
    if (relations.length) {
      await transaction.rolePermission.createMany({
        data: relations.map(({ permissionId }) => ({ roleId: created.id, permissionId })),
      });
    }
    await transaction.auditLog.create({
      data: { userId: req.auth!.userId, action: "CREATE_ROLE", moduleId: "roles", recordId: created.id, changes: { permissions: input.permissions } },
    });
    return created;
  });
  res.status(201).json({ role: { id: role.id, key: role.key, name: role.name, description: role.description, permissions: input.permissions } });
}));

router.put("/roles/:roleId/permissions", asyncHandler(async (req, res) => {
  const { permissions } = updatePermissionsSchema.parse(req.body);
  assertValidPermissionKeys(permissions);
  if (permissions.includes("*") && !req.auth!.permissionKeys.includes("*")) {
    throw new ApiError(403, "Only a full administrator can grant wildcard access.", "FORBIDDEN");
  }
  const updated = await prisma.$transaction(async (transaction) => {
    const role = await transaction.role.findUnique({ where: { id: req.params.roleId } });
    if (!role) throw new ApiError(404, "Role not found.", "NOT_FOUND");
    if (role.key === "administrator" && !permissions.includes("*")) {
      throw new ApiError(400, "The administrator role must retain wildcard access.", "ADMIN_ACCESS_REQUIRED");
    }
    await transaction.rolePermission.deleteMany({ where: { roleId: role.id } });
    const relations = await connectPermissions(transaction, permissions);
    if (relations.length) await transaction.rolePermission.createMany({ data: relations.map(({ permissionId }) => ({ roleId: role.id, permissionId })) });
    await transaction.auditLog.create({
      data: { userId: req.auth!.userId, action: "UPDATE_ROLE_PERMISSIONS", moduleId: "roles", recordId: role.id, changes: { permissions } },
    });
    return role;
  });
  res.json({ roleId: updated.id, permissions });
}));

async function connectPermissions(transaction: Prisma.TransactionClient, keys: string[]) {
  const relations: Array<{ permissionId: string }> = [];
  for (const key of new Set(keys)) {
    const permission = await transaction.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });
    relations.push({ permissionId: permission.id });
  }
  return relations;
}

function assertValidPermissionKeys(permissionKeys: string[]): void {
  for (const key of permissionKeys) {
    if (key === "*" || key === "modules:read" || key === "access:manage") continue;
    const match = /^records:([a-z0-9-]+):(read|create|update|delete)$/.exec(key);
    if (!match || !modules.some((module) => module.id === match[1])) {
      throw new ApiError(400, `Invalid permission key: ${key}.`, "VALIDATION_FAILED");
    }
  }
}

export default router;
