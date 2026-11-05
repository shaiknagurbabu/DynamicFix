import assert from "node:assert/strict";
import test from "node:test";
import { moduleById, modules } from "../../../shared/modules.js";
import { ApiError } from "../middleware/errors.js";
import { validateRecord } from "./validation.js";

test("all shared sample records satisfy the server-side module validators", () => {
  for (const module of modules) {
    for (const [index, sample] of module.seed.entries()) {
      assert.doesNotThrow(
        () => validateRecord(module, sample),
        `${module.id} sample record ${index + 1} should be valid`,
      );
    }
  }
});

test("validates and trims employee records using the shared module schema", () => {
  const module = moduleById("employees");
  assert.ok(module);
  const record = validateRecord(module, {
    name: "  Ava Johnson  ",
    employeeId: " EMP-1042 ",
    department: "Operations",
    position: "Operations Lead",
    email: "ava@dynamicfix.com",
    status: "Active",
  });
  assert.equal(record.name, "Ava Johnson");
  assert.equal(record.employeeId, "EMP-1042");
});

test("rejects unknown fields and invalid configured choices", () => {
  const module = moduleById("employees");
  assert.ok(module);
  const valid = { name: "Ava", employeeId: "EMP-1", department: "Ops", position: "Lead", email: "ava@example.com", status: "Active" };
  assert.throws(() => validateRecord(module, { ...valid, isAdmin: "true" }), (error: unknown) =>
    error instanceof ApiError && error.status === 400 && error.message.includes("Unknown field"),
  );
  assert.throws(() => validateRecord(module, { ...valid, status: "Root" }), (error: unknown) =>
    error instanceof ApiError && error.status === 400 && error.message.includes("configured options"),
  );
});

test("rejects malformed ISO dates and non-numeric values", () => {
  const payroll = moduleById("payroll");
  const attendance = moduleById("attendance");
  assert.ok(payroll);
  assert.ok(attendance);
  assert.throws(() => validateRecord(payroll, { employee: "Ava", period: "November", amount: "NaN", paidOn: "", status: "Paid" }), ApiError);
  assert.throws(() => validateRecord(attendance, { employee: "Ava", date: "2026-02-31", checkIn: "", checkOut: "", status: "Present" }), ApiError);
});
