import "dotenv/config";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { modules } from "../../shared/modules.js";
import { prisma } from "../src/db/prisma.js";

const seedSchema = z.object({
  ADMIN_EMAIL: z.string().trim().email().transform((email) => email.toLowerCase()),
  ADMIN_PASSWORD: z.string().min(12, "ADMIN_PASSWORD must be at least 12 characters."),
  ADMIN_NAME: z.string().trim().min(1).default("DynamicFix Administrator"),
});

async function seed(): Promise<void> {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = seedSchema.parse(process.env);
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const administrator = await prisma.role.upsert({
    where: { key: "administrator" },
    update: { name: "Administrator" },
    create: { key: "administrator", name: "Administrator", description: "Full access to every ERP module." },
  });
  const allPermission = await prisma.permission.upsert({
    where: { key: "*" },
    update: {},
    create: { key: "*" },
  });
  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: administrator.id, permissionId: allPermission.id } },
    update: {},
    create: { roleId: administrator.id, permissionId: allPermission.id },
  });
  const adminUser = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { name: ADMIN_NAME, status: "ACTIVE" },
    create: { email: ADMIN_EMAIL, name: ADMIN_NAME, passwordHash },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: administrator.id } },
    update: {},
    create: { userId: adminUser.id, roleId: administrator.id },
  });

  for (const module of modules) {
    for (const [index, data] of module.seed.entries()) {
      const seedKey = `${module.id}:${index + 1}`;
      await prisma.erpRecord.upsert({
        where: { seedKey },
        update: { moduleId: module.id, data, archivedAt: null },
        create: { seedKey, moduleId: module.id, data },
      });
    }
  }

  console.info(`Seeded administrator ${ADMIN_EMAIL} and ${modules.length} module catalogs.`);
}

seed()
  .catch((error: unknown) => {
    console.error("Database seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
