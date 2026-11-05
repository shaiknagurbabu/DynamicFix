import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters."),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:5173"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
});

export const env = envSchema.parse(process.env);
