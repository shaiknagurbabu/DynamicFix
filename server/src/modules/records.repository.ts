import { Prisma, type ErpRecord } from "@prisma/client";
import type { RecordData } from "../../../shared/modules.js";
import { prisma } from "../db/prisma.js";

export interface RecordListOptions {
  page: number;
  limit: number;
  search?: string;
  filterField?: string;
  filterValue?: string;
  includeArchived: boolean;
}

export class RecordNotFoundError extends Error {
  constructor(message = "Record not found.") {
    super(message);
    this.name = "RecordNotFoundError";
  }
}

export async function listRecords(moduleId: string, options: RecordListOptions, searchableFields: string[]) {
  const conditions = [Prisma.sql`"moduleId" = ${moduleId}`];
  if (!options.includeArchived) conditions.push(Prisma.sql`"archivedAt" IS NULL`);
  if (options.filterField && options.filterValue !== undefined) {
    conditions.push(Prisma.sql`"data" ->> ${options.filterField} = ${options.filterValue}`);
  }
  if (options.search) {
    const escapedSearch = options.search.replace(/[\\%_]/g, "\\$&");
    const searchTerm = `%${escapedSearch}%`;
    const searchConditions = searchableFields.map((field) =>
      Prisma.sql`"data" ->> ${field} ILIKE ${searchTerm}`,
    );
    conditions.push(Prisma.sql`(${Prisma.join(searchConditions, " OR ")})`);
  }
  const where = Prisma.join(conditions, " AND ");
  const offset = (options.page - 1) * options.limit;
  const [records, countRows] = await prisma.$transaction([
    prisma.$queryRaw<ErpRecord[]>(Prisma.sql`
      SELECT "id", "moduleId", "data", "seedKey", "createdAt", "updatedAt", "archivedAt"
      FROM "ErpRecord"
      WHERE ${where}
      ORDER BY "createdAt" DESC, "id" ASC
      LIMIT ${options.limit} OFFSET ${offset}
    `),
    prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      SELECT COUNT(*) AS "total"
      FROM "ErpRecord"
      WHERE ${where}
    `),
  ]);
  return { records, total: Number(countRows[0]?.total ?? 0n) };
}

export async function createRecord(userId: string, moduleId: string, data: RecordData) {
  return prisma.$transaction(async (transaction) => {
    const record = await transaction.erpRecord.create({ data: { moduleId, data } });
    await transaction.auditLog.create({
      data: { userId, action: "CREATE", moduleId, recordId: record.id, changes: { fields: Object.keys(data) } },
    });
    return record;
  });
}

export function getRecord(moduleId: string, recordId: string) {
  return prisma.erpRecord.findFirst({ where: { id: recordId, moduleId, archivedAt: null } });
}

export async function updateRecord(userId: string, moduleId: string, recordId: string, data: RecordData) {
  return prisma.$transaction(async (transaction) => {
    const current = await transaction.erpRecord.findFirst({
      where: { id: recordId, moduleId, archivedAt: null },
    });
    if (!current) throw new RecordNotFoundError();
    const record = await transaction.erpRecord.update({ where: { id: current.id }, data: { data } });
    await transaction.auditLog.create({
      data: { userId, action: "UPDATE", moduleId, recordId: record.id, changes: { fields: Object.keys(data) } },
    });
    return record;
  });
}

export async function deleteRecord(userId: string, moduleId: string, recordId: string, softDelete: boolean) {
  return prisma.$transaction(async (transaction) => {
    const current = await transaction.erpRecord.findFirst({
      where: { id: recordId, moduleId, archivedAt: null },
    });
    if (!current) throw new RecordNotFoundError();
    if (softDelete) {
      const record = await transaction.erpRecord.update({
        where: { id: current.id },
        data: { archivedAt: new Date() },
      });
      await transaction.auditLog.create({
        data: { userId, action: "ARCHIVE", moduleId, recordId: record.id, changes: { archived: true } },
      });
      return { id: record.id, archived: true };
    }
    await transaction.erpRecord.delete({ where: { id: current.id } });
    await transaction.auditLog.create({
      data: { userId, action: "DELETE", moduleId, recordId: current.id, changes: { deleted: true } },
    });
    return { id: current.id, archived: false };
  });
}

export async function restoreRecord(userId: string, moduleId: string, recordId: string) {
  return prisma.$transaction(async (transaction) => {
    const current = await transaction.erpRecord.findFirst({
      where: { id: recordId, moduleId, archivedAt: { not: null } },
    });
    if (!current) throw new RecordNotFoundError("Archived record not found.");
    const record = await transaction.erpRecord.update({
      where: { id: current.id },
      data: { archivedAt: null },
    });
    await transaction.auditLog.create({
      data: { userId, action: "RESTORE", moduleId, recordId: record.id, changes: { restored: true } },
    });
    return record;
  });
}
