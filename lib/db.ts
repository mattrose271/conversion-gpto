import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Create PostgreSQL adapter
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

// Lazy initialization - only create client when accessed, not during module import
function getDb() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = getPrismaClient();
  }
  return globalForPrisma.prisma;
}

// Export a getter that lazily initializes the client
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return getDb()[prop as keyof PrismaClient];
  }
});
