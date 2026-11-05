import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";

const server = app.listen(env.API_PORT, () => {
  console.info(`DynamicFix ERP API listening on http://localhost:${env.API_PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close((error) => {
      if (error) {
        console.error("Could not close the API server cleanly.", error);
        process.exitCode = 1;
      }
      void prisma.$disconnect().catch((disconnectError: unknown) => {
        console.error("Could not disconnect from PostgreSQL cleanly.", disconnectError);
        process.exitCode = 1;
      });
    });
  });
}
