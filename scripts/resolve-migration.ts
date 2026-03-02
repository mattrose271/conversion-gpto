import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";

// Load environment variables
config();

// Verify DATABASE_URL is set
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create PostgreSQL adapter
const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🔍 Checking migration status...");
  
  // Check if admin_users table exists
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'admin_users'
    );
  `);
  
  const tableExists = result.rows[0].exists;
  
  if (tableExists) {
    console.log("✅ admin_users table exists");
    console.log("📝 Marking migration as resolved...");
    console.log("\nRun this command:");
    console.log("npx prisma migrate resolve --applied 20260302000001_add_admin_user");
    console.log("\nThen run:");
    console.log("npm run admin:create");
  } else {
    console.log("❌ admin_users table does not exist");
    console.log("📝 You need to run the migration first:");
    console.log("\nnpx prisma migrate resolve --rolled-back 20260302000001_add_admin_user");
    console.log("npx prisma migrate deploy");
  }
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
