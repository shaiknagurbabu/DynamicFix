import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { ApiError, asyncHandler } from "../middleware/errors.js";

const router = Router();
const dummyPasswordHash = bcrypt.hashSync("dynamicfix-unknown-account-placeholder", 12);
const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(256),
}).strict();

router.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? dummyPasswordHash);
  if (!user || user.status !== "ACTIVE" || !passwordMatches) {
    throw new ApiError(401, "Email or password is incorrect.", "INVALID_CREDENTIALS");
  }
  const accessToken = jwt.sign({ sub: user.id }, env.JWT_SECRET, { expiresIn: "8h" });
  res.json({
    accessToken,
    tokenType: "Bearer",
    expiresIn: 28800,
    user: { id: user.id, name: user.name, email: user.email },
  });
}));

router.get("/me", authenticate, asyncHandler(async (req, res) => {
  const auth = req.auth!;
  res.json({
    user: { id: auth.userId, name: auth.name, email: auth.email },
    roles: auth.roleKeys,
    permissions: auth.permissionKeys,
  });
}));

export default router;
