import type { Prisma, ErpRecord } from "@prisma/client";
import { moduleById, type RecordData } from "../../../shared/modules.js";
import { ApiError } from "../middleware/errors.js";
import { validateRecord } from "./validation.js";
import {
  createRecord as createRecordRepository,
  deleteRecord as deleteRecordRepository,
  getRecord as getRecordRepository,
  listRecords as listRecordsRepository,
  RecordNotFoundError,
  restoreRecord as restoreRecordRepository,
  updateRecord as updateRecordRepository,
  type RecordListOptions,
} from "./records.repository.js";

export function getModule(moduleId: string) {
  const module = moduleById(moduleId);
  if (!module) throw new ApiError(404, "Module not found.", "MODULE_NOT_FOUND");
  return module;
}

export async function listModuleRecords(moduleId: string, options: RecordListOptions) {
  const module = getModule(moduleId);
  if ((options.filterField && options.filterValue === undefined) || (!options.filterField && options.filterValue !== undefined)) {
    throw new ApiError(400, "filterField and filterValue must be provided together.", "VALIDATION_FAILED");
  }
  if (options.filterField && !module.fields.some((field) => field.key === options.filterField)) {
    throw new ApiError(400, "filterField must match a field in this module.", "VALIDATION_FAILED");
  }
  const result = await listRecordsRepository(
    module.id,
    options,
    module.fields.map((field) => field.key),
  );
  return {
    records: result.records.map(toRecordResponse),
    pagination: { page: options.page, limit: options.limit, total: result.total, pages: Math.ceil(result.total / options.limit) },
  };
}

export async function createModuleRecord(moduleId: string, userId: string, input: unknown) {
  const module = getModule(moduleId);
  const data = validateRecord(module, input);
  return { record: toRecordResponse(await createRecordRepository(userId, module.id, data)) };
}

export async function getModuleRecord(moduleId: string, recordId: string) {
  const module = getModule(moduleId);
  const record = await getRecordRepository(module.id, recordId);
  if (!record) throw new ApiError(404, "Record not found.", "NOT_FOUND");
  return { record: toRecordResponse(record) };
}

export async function updateModuleRecord(moduleId: string, recordId: string, userId: string, input: unknown) {
  const module = getModule(moduleId);
  const data = validateRecord(module, input);
  try {
    return { record: toRecordResponse(await updateRecordRepository(userId, module.id, recordId, data)) };
  } catch (error) {
    if (error instanceof RecordNotFoundError) throw new ApiError(404, error.message, "NOT_FOUND");
    throw error;
  }
}

export async function deleteModuleRecord(moduleId: string, recordId: string, userId: string) {
  const module = getModule(moduleId);
  try {
    return await deleteRecordRepository(userId, module.id, recordId, Boolean(module.softDelete));
  } catch (error) {
    if (error instanceof RecordNotFoundError) throw new ApiError(404, error.message, "NOT_FOUND");
    throw error;
  }
}

export async function restoreModuleRecord(moduleId: string, recordId: string, userId: string) {
  const module = getModule(moduleId);
  if (!module.softDelete) throw new ApiError(400, "This module does not support archiving.", "RESTORE_NOT_SUPPORTED");
  try {
    return { record: toRecordResponse(await restoreRecordRepository(userId, module.id, recordId)) };
  } catch (error) {
    if (error instanceof RecordNotFoundError) throw new ApiError(404, error.message, "NOT_FOUND");
    throw error;
  }
}

function toRecordResponse(record: ErpRecord) {
  return {
    id: record.id,
    moduleId: record.moduleId,
    data: toRecordData(record.data),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    archivedAt: record.archivedAt,
  };
}

function toRecordData(value: Prisma.JsonValue): RecordData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(500, "Stored record data is invalid.", "INVALID_STORED_RECORD");
  }
  const record: RecordData = {};
  for (const [key, fieldValue] of Object.entries(value)) {
    if (typeof fieldValue !== "string") {
      throw new ApiError(500, "Stored record data is invalid.", "INVALID_STORED_RECORD");
    }
    record[key] = fieldValue;
  }
  return record;
}
