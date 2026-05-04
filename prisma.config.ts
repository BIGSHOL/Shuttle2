import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7는 datasource URL을 schema.prisma에서 받지 않고 여기서 정의.
// CLI(migrate·db push·studio)는 DDL 호환을 위해 DIRECT_URL(5432 session pooler) 사용.
// 앱 런타임은 lib/db.ts의 PrismaPg adapter가 DATABASE_URL(6543 transaction pooler)를 사용.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});
