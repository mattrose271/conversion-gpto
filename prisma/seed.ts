import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { tierDeliverables } from "../lib/data/tierDeliverables.js";
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
  console.log("🌱 Seeding tier deliverables...");

  for (const deliverable of tierDeliverables) {
    const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || null;

    const result = await prisma.tierDeliverable.upsert({
      where: { tier: deliverable.tier },
      update: {
        title: deliverable.title,
        price: deliverable.price,
        subtitle: deliverable.subtitle,
        deliverables: deliverable.deliverables,
        calendlyUrl: calendlyUrl || deliverable.calendlyUrl || null,
        updatedAt: new Date()
      },
      create: {
        tier: deliverable.tier,
        title: deliverable.title,
        price: deliverable.price,
        subtitle: deliverable.subtitle,
        deliverables: deliverable.deliverables,
        calendlyUrl: calendlyUrl || deliverable.calendlyUrl || null
      }
    });

    console.log(`✅ Seeded ${result.tier} tier: ${result.title}`);
  }

  console.log("✨ Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
