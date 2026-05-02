import { PrismaClient } from "@prisma/client";

// Next.js dev 핫리로드 시 PrismaClient 인스턴스가 누적되는 것 방지.
// globalThis에 캐시해 단일 인스턴스를 재사용한다.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
