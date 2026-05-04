import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7는 PrismaClient에 driver adapter가 필수.
// Supabase Postgres → @prisma/adapter-pg + pg 드라이버.
// 앱 런타임은 transaction pooler(6543, pgbouncer=true). DDL/마이그레이션만 DIRECT_URL(5432) 사용.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

// Next.js dev 핫리로드 대응 — 매 reload마다 PrismaClient 새로 만들면 connection이 누적됨.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
