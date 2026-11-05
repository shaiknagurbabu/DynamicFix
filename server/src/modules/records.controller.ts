import type { RequestHandler } from "express";
import { z } from "zod";
import { modules } from "../../../shared/modules.js";
import { ApiError, asyncHandler } from "../middleware/errors.js";
import {
  createModuleRecord,
  deleteModuleRecord,
  getModuleRecord,
  listModuleRecords,
  restoreModuleRecord,
  updateModuleRecord,
} from "./records.service.js";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  filterField: z.string().optional(),
  filterValue: z.string().optional(),
  includeArchived: z.enum(["true", "false"]).default("false"),
});

export const authorizeModuleAction = (action: string): RequestHandler => (req, _res, next) => {
  const module = modules.find((item) => item.id === req.params.moduleId);
  if (!module) {
    next(new ApiError(404, "Module not found.", "MODULE_NOT_FOUND"));
    return;
  }
  const permission = `records:${module.id}:${action}`;
  if (!req.auth || (!req.auth.permissionKeys.includes("*") && !req.auth.permissionKeys.includes(permission))) {
    next(new ApiError(req.auth ? 403 : 401, req.auth ? "You do not have permission to perform this action." : "Authentication is required.", req.auth ? "FORBIDDEN" : "UNAUTHENTICATED"));
    return;
  }
  next();
};

export const listModulesController: RequestHandler = (_req, res) => {
  res.json({
    modules: modules.map(({ id, name, group, description, softDelete, fields }) => ({
      id, name, group, description, softDelete: Boolean(softDelete), fields,
    })),
  });
};

export const listRecordsController: RequestHandler = asyncHandler(async (req, res) => {
  const query = listQuerySchema.parse(req.query);
  res.json(await listModuleRecords(req.params.moduleId, {
    page: query.page,
    limit: query.limit,
    search: query.search,
    filterField: query.filterField,
    filterValue: query.filterValue,
    includeArchived: query.includeArchived === "true",
  }));
});

export const createRecordController: RequestHandler = asyncHandler(async (req, res) => {
  const result = await createModuleRecord(req.params.moduleId, req.auth!.userId, req.body);
  res.status(201).json(result);
});

export const getRecordController: RequestHandler = asyncHandler(async (req, res) => {
  res.json(await getModuleRecord(req.params.moduleId, req.params.recordId));
});

export const updateRecordController: RequestHandler = asyncHandler(async (req, res) => {
  res.json(await updateModuleRecord(req.params.moduleId, req.params.recordId, req.auth!.userId, req.body));
});

export const deleteRecordController: RequestHandler = asyncHandler(async (req, res) => {
  res.json(await deleteModuleRecord(req.params.moduleId, req.params.recordId, req.auth!.userId));
});

export const restoreRecordController: RequestHandler = asyncHandler(async (req, res) => {
  res.json(await restoreModuleRecord(req.params.moduleId, req.params.recordId, req.auth!.userId));
});
