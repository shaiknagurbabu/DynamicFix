import { Router } from "express";
import { z } from "zod";
import { modules } from "../../../shared/modules.js";
import { prisma } from "../db/prisma.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { ApiError, asyncHandler } from "../middleware/errors.js";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  moduleId: z.string().optional(),
  userId: z.string().optional(),
});

const router = Router();
router.use(authenticate, requirePermission("records:audit-logs:read"));

router.get("/", asyncHandler(async (req, res) => {
  const query = querySchema.parse(req.query);
  if (query.moduleId && !modules.some((module) => module.id === query.moduleId)) {
    throw new ApiError(400, "moduleId must match a configured module.", "VALIDATION_FAILED");
  }
  const where = {
    ...(query.moduleId ? { moduleId: query.moduleId } : {}),
    ...(query.userId ? { userId: query.userId } : {}),
  };
  const [entries, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);
  res.json({
    entries,
    pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
  });
}));

export default router;
