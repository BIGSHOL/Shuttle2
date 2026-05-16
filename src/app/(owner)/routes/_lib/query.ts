// W26-F: 노선 list searchParams 파싱 + Prisma 쿼리 빌드.
// 정류장 stops/_lib/query.ts 패턴 mirror — 검색·필터·정렬 통일.

import "server-only";

import { z } from "zod";

import { db } from "@/lib/db";

export const DIRECTION_FILTERS = ["all", "PICKUP", "DROPOFF"] as const;
export const ACTIVE_FILTERS = ["all", "active", "inactive"] as const;
export const MODE_FILTERS = ["all", "KIDS", "GENERAL"] as const;
export const SORT_KEYS = ["name", "direction", "stops", "students"] as const;
export const SORT_DIRS = ["asc", "desc"] as const;

export type DirectionFilter = (typeof DIRECTION_FILTERS)[number];
export type ActiveFilter = (typeof ACTIVE_FILTERS)[number];
export type ModeFilter = (typeof MODE_FILTERS)[number];
export type SortKey = (typeof SORT_KEYS)[number];
export type SortDir = (typeof SORT_DIRS)[number];

export const routesParamsSchema = z.object({
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  direction: z.enum(DIRECTION_FILTERS).default("all"),
  active: z.enum(ACTIVE_FILTERS).default("all"),
  mode: z.enum(MODE_FILTERS).default("all"),
  sort: z.enum(SORT_KEYS).default("direction"),
  dir: z.enum(SORT_DIRS).default("asc"),
});

export type ParsedRoutesParams = z.infer<typeof routesParamsSchema>;

export type RawSearchParams = Record<string, string | string[] | undefined>;

function pickFirst(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export function parseRoutesSearchParams(raw: RawSearchParams): ParsedRoutesParams {
  const candidate = {
    q: pickFirst(raw.q),
    direction: pickFirst(raw.direction),
    active: pickFirst(raw.active),
    mode: pickFirst(raw.mode),
    sort: pickFirst(raw.sort),
    dir: pickFirst(raw.dir),
  };
  const result = routesParamsSchema.safeParse(candidate);
  if (result.success) return result.data;
  return routesParamsSchema.parse({});
}

function buildWhere(orgId: string, p: ParsedRoutesParams) {
  // Route 는 orgId 직접 컬럼 없음 — vehicle.orgId 경유.
  const vehicleFilter: Record<string, unknown> = { orgId };
  if (p.mode !== "all") vehicleFilter.mode = p.mode;

  const where: Record<string, unknown> = { vehicle: vehicleFilter };

  if (p.q) {
    where.OR = [
      { name: { contains: p.q, mode: "insensitive" } },
      { vehicle: { plate: { contains: p.q, mode: "insensitive" }, orgId } },
    ];
  }
  if (p.direction !== "all") {
    where.direction = p.direction;
  }
  if (p.active === "active") {
    where.isActive = true;
  } else if (p.active === "inactive") {
    where.isActive = false;
  }
  return where;
}

function buildOrderBy(p: ParsedRoutesParams) {
  switch (p.sort) {
    case "name":
      return [{ name: p.dir }];
    case "stops":
      return [{ stops: { _count: p.dir } }, { name: "asc" as const }];
    case "students":
      return [{ students: { _count: p.dir } }, { name: "asc" as const }];
    case "direction":
    default:
      return [{ direction: p.dir }, { name: "asc" as const }];
  }
}

export async function listRoutes(orgId: string, p: ParsedRoutesParams) {
  return db.route.findMany({
    where: buildWhere(orgId, p),
    orderBy: buildOrderBy(p),
    include: {
      vehicle: { select: { plate: true, mode: true } },
      _count: { select: { stops: true, students: true } },
    },
  });
}

export type RouteRow = Awaited<ReturnType<typeof listRoutes>>[number];

export function hasActiveFilters(p: ParsedRoutesParams): boolean {
  return Boolean(
    p.q ||
      p.direction !== "all" ||
      p.active !== "all" ||
      p.mode !== "all" ||
      p.sort !== "direction" ||
      p.dir !== "asc",
  );
}
