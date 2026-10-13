import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma } from "@/lib/prisma";

const testDatabaseUrl=process.env.TEST_DATABASE_URL;
describe.skipIf(!testDatabaseUrl)("PostgreSQL catalogue integration",()=>{
  let db:ReturnType<typeof getPrisma>;
  beforeAll(async()=>{process.env.DATABASE_URL=testDatabaseUrl;db=getPrisma();await db.$queryRaw`SELECT 1`;});
  afterAll(async()=>{await db?.$disconnect();});
  it("reads the migrated development store settings and seeded categories",async()=>{expect(await db.storeSettings.findUnique({where:{key:"default"}})).not.toBeNull();expect(await db.category.count({where:{isActive:true}})).toBeGreaterThan(0);});
});
