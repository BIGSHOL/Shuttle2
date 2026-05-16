// W26-E: 정류장 list searchParams 파싱 + Prisma 쿼리 빌드.
// 학생 _lib/query.ts 패턴 mirror — 검색·필터·정렬 통일.
// 페이지네이션은 후속 (정류장은 학원당 100개 이하 가정).

import "server-only";

import { z } from "zod";

import { db } from "@/lib/db";

export const USAGE_FILTERS = ["all", "used", "unused"] as const;
export const ACTIVE_FILTERS = ["all", "active", "inactive"] as const;
export const SORT_KEYS = ["name", "radius", "routes"] as const;
export const SORT_DIRS = ["asc", "desc"] as const;

export type UsageFilter = (typeof USAGE_FILTERS)[number];
export type ActiveFilter = (typeof ACTIVE_FILTERS)[number];
export type SortKey = (typeof SORT_KEYS)[number];
export type SortDir = (typeof SORT_DIRS)[number];

export const stopsParamsSchema = z.object({
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  usage: z.enum(USAGE_FILTERS).default("all"),
  active: z.enum(ACTIVE_FILTERS).default("all"),
  sort: z.enum(SORT_KEYS).default("name"),
  dir: z.enum(SORT_DIRS).default("asc"),
});

export type ParsedStopsParams = z.infer<typeof stopsParamsSchema>;

export type RawSearchParams = Record<string, string | string[] | undefined>;

function pickFirst(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export function parseStopsSearchParams(raw: RawSearchParams): ParsedStopsParams {
  const candidate = {
    q: pickFirst(raw.q),
    usage: pickFirst(raw.usage),
    active: pickFirst(raw.active),
    sort: pickFirst(raw.sort),
    dir: pickFirst(raw.dir),
  };
  const result = stopsParamsSchema.safeParse(candidate);
  if (result.success) return result.data;
  return stopsParamsSchema.parse({});
}

function buildWhere(orgId: string, p: ParsedStopsParams) {
  const where: Record<string, unknown> = { orgId };
  if (p.q) {
    where.OR = [
      { name: { contains: p.q, mode: "insensitive" } },
      { address: { contains: p.q, mode: "insensitive" } },
    ];
  }
  if (p.usage === "used") {
    where.routes = { some: {} };
  } else if (p.usage === "unused") {
    where.routes = { none: {} };
  }
  if (p.active === "active") {
    where.isActive = true;
  } else if (p.active === "inactive") {
    where.isActive = false;
  }
  return where;
}

function buildOrderBy(p: ParsedStopsParams) {
  switch (p.sort) {
    case "radius":
      return [{ radiusM: p.dir }, { name: "asc" as const }];
    case "routes":
      // _count는 orderBy 지원 안 함 → Prisma의 _count 필드는 별도 _count 정렬 문법
      return [{ routes: { _count: p.dir } }, { name: "asc" as const }];
    case "name":
    default:
      return [{ name: p.dir }];
  }
}

export async function listStops(orgId: string, p: ParsedStopsParams) {
  return db.stop.findMany({
    where: buildWhere(orgId, p),
    orderBy: buildOrderBy(p),
    include: {
      _count: { select: { routes: true } },
    },
  });
}

export async function countStops(
  orgId: string,
  p: ParsedStopsParams,
): Promise<number> {
  return db.stop.count({ where: buildWhere(orgId, p) });
}

export type StopRow = Awaited<ReturnType<typeof listStops>>[number];

export function hasActiveFilters(p: ParsedStopsParams): boolean {
  return Boolean(
    p.q || p.usage !== "all" || p.active !== "all" || p.sort !== "name" || p.dir !== "asc",
  );
}
