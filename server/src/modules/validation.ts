import type { ErpModule, RecordData } from "../../../shared/modules.js";
import { ApiError } from "../middleware/errors.js";

export function validateRecord(module: ErpModule, value: unknown): RecordData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "A record must be a JSON object.", "VALIDATION_FAILED");
  }

  const input = value as Record<string, unknown>;
  const allowedFields = new Set(module.fields.map((field) => field.key));
  const unknownFields = Object.keys(input).filter((key) => !allowedFields.has(key));
  if (unknownFields.length) {
    throw new ApiError(400, `Unknown field(s): ${unknownFields.join(", ")}.`, "VALIDATION_FAILED");
  }

  const record: RecordData = {};
  for (const field of module.fields) {
    const raw = input[field.key];
    if (raw === undefined || raw === null) {
      if (field.required) throw new ApiError(400, `${field.label} is required.`, "VALIDATION_FAILED");
      record[field.key] = "";
      continue;
    }
    if (typeof raw !== "string") {
      throw new ApiError(400, `${field.label} must be a string.`, "VALIDATION_FAILED");
    }

    const normalized = raw.trim();
    if (field.required && !normalized) {
      throw new ApiError(400, `${field.label} is required.`, "VALIDATION_FAILED");
    }
    if (field.kind === "number" && normalized && !/^-?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) {
      throw new ApiError(400, `${field.label} must be a valid number.`, "VALIDATION_FAILED");
    }
    if (field.kind === "date" && normalized && !isIsoDate(normalized)) {
      throw new ApiError(400, `${field.label} must be a valid date in YYYY-MM-DD format.`, "VALIDATION_FAILED");
    }
    if (field.kind === "select" && normalized && !field.options?.includes(normalized)) {
      throw new ApiError(400, `${field.label} must be one of the configured options.`, "VALIDATION_FAILED");
    }
    if (field.kind === "email" && normalized && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new ApiError(400, `${field.label} must be a valid email address.`, "VALIDATION_FAILED");
    }
    if (field.key.toLowerCase().includes("email") && normalized && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new ApiError(400, `${field.label} must be a valid email address.`, "VALIDATION_FAILED");
    }
    record[field.key] = normalized;
  }
  return record;
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
