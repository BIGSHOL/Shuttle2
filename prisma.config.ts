import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7는 datasource URL을 더 이상 schema.prisma에서 받지 않는다.
// 마이그레이션·런타임 모두 일단 DIRECT_URL(5432) 사용.
// W6+ 트래픽 늘면 PrismaClient에 @prisma/adapter-pg 어댑터로 pooler(6543) 전환 검토.
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
