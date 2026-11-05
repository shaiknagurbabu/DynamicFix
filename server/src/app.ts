import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env.js";
import authRoutes from "./auth/routes.js";
import adminRoutes from "./admin/routes.js";
import auditRoutes from "./audit/routes.js";
import moduleRoutes from "./modules/routes.js";
import { asyncHandler, errorHandler, notFoundHandler } from "./middleware/errors.js";
import { prisma } from "./db/prisma.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_ORIGIN }));
app.use(express.json({ limit: "256kb" }));

app.get("/api/health", asyncHandler(async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: "ok", service: "dynamicfix-erp-api" });
}));

app.use("/api/auth/login", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
}));
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/modules", moduleRoutes);
app.use(notFoundHandler);
app.use(errorHandler);
