import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const db = new PrismaClient({ adapter });

(async () => {
  const org = await db.organization.findFirst({
    where: { name: "데모 학원·어린이집 (시드)" },
  });
  if (!org) {
    console.log("NO DEMO ORG");
    return;
  }
  const staffs = await db.staff.findMany({
    where: { orgId: org.id },
    select: { name: true, loginId: true, recoveryEmail: true, role: true, userId: true },
  });
  console.log("STAFF:", JSON.stringify(staffs, null, 2));
  const guardians = await db.guardian.findMany({
    where: { phone: { startsWith: "010-2000-" } },
    select: { name: true, loginId: true, recoveryEmail: true, userId: true, phone: true },
  });
  console.log("GUARDIANS:", JSON.stringify(guardians, null, 2));
  await db.$disconnect();
})();
