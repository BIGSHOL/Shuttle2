// 학원장 학생 목록 페이지 — searchParams 파싱 + Prisma 쿼리 빌드.
// W23-C에 추가. zod로 URL 파라미터 검증, gradeRange로 학년 카테고리 → birthYear 변환.
//
// 5단계 학년 카테고리(미취학·초·중·고·대학·성인) + "어린이용 모드(만 13세 미만)" 토글.
// gradeFromBirthYear()의 schoolYear 규칙(3월 1일 새 학년)과 동일.
//
// 상수·타입은 _lib/constants.ts로 분리 (client component가 import해도 안전).
// 이 파일은 server-only — Prisma·zod 사용.

import "server-only";

import { z } from "zod";

import { db } from "@/lib/db";

import {
  GRADE_CATEGORIES,
  PAGE_SIZES,
  ROUTE_FILTERS,
  SORT_DIRS,
  SORT_KEYS,
  type GradeCategory,
  type PageSize,
  type ParsedParams,
} from "./constants";

// re-export — 기존 import path 호환 유지.
export {
  GRADE_CATEGORIES,
  GRADE_LABELS,
  PAGE_SIZES,
  ROUTE_FILTERS,
  SORT_DIRS,
  SORT_KEYS,
} from "./constants";
export type {
  GradeCategory,
  PageSize,
  ParsedParams,
  RouteFilter,
  SortDir,
  SortKey,
} from "./constants";

export const studentsParamsSchema = z.object({
  q: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  grade: z.enum(GRADE_CATEGORIES).optional(),
  school: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  routes: z.enum(ROUTE_FILTERS).optional(),
  sort: z.enum(SORT_KEYS).default("year"),
  dir: z.enum(SORT_DIRS).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  size: z
    .union([z.literal(10), z.literal(20), z.literal(50)])
    .default(20)
    .or(z.coerce.number().int())
    .transform((n) => {
      const num = Number(n);
      return PAGE_SIZES.includes(num as PageSize) ? (num as PageSize) : 20;
    }),
});

// ParsedParams는 constants.ts에서 export. zod schema와 동기화 유지.
// (constants.ts의 ParsedParams 타입과 z.infer<typeof studentsParamsSchema>이
//  일치하는지 build·typecheck로 1차 보장)

export type RawSearchParams = Record<
  string,
  string | string[] | undefined
>;

function pickFirst(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export function parseStudentsSearchParams(raw: RawSearchParams): ParsedParams {
  const candidate = {
    q: pickFirst(raw.q),
    grade: pickFirst(raw.grade),
    school: pickFirst(raw.school),
    routes: pickFirst(raw.routes),
    sort: pickFirst(raw.sort),
    dir: pickFirst(raw.dir),
    page: pickFirst(raw.page),
    size: pickFirst(raw.size),
  };
  const result = studentsParamsSchema.safeParse(candidate);
  if (result.success) return result.data;
  // 잘못된 URL 파라미터로 500 안 나게 default fallback
  return studentsParamsSchema.parse({});
}

// 학년 카테고리 → birthYear 범위 (학년도 3월 1일 시작 규칙).
// SY = schoolYear, 1·2월은 이전 학년도.
export function gradeRange(
  category: GradeCategory,
  today: Date = new Date(),
): { gte: number; lte: number } {
  const month = today.getMonth(); // 0=1월
  const year = today.getFullYear();
  const SY = month < 2 ? year - 1 : year;
  switch (category) {
    case "pre":
      return { gte: SY - 6, lte: SY };
    case "elem":
      return { gte: SY - 12, lte: SY - 7 };
    case "mid":
      return { gte: SY - 15, lte: SY - 13 };
    case "high":
      return { gte: SY - 18, lte: SY - 16 };
    case "adult":
      return { gte: 1900, lte: SY - 19 };
    case "kids":
      return { gte: SY - 12, lte: SY };
  }
}

// listStudents·countStudents 공유. 타입 명시 없이 inline literal로 prisma에 그대로 전달.
function buildWhere(orgId: string, p: ParsedParams) {
  const where: Record<string, unknown> = { orgId };
  if (p.q) {
    where.OR = [
      { name: { contains: p.q, mode: "insensitive" } },
      { school: { contains: p.q, mode: "insensitive" } },
    ];
  }
  if (p.grade) {
    where.birthYear = gradeRange(p.grade);
  }
  if (p.school) {
    where.school = p.school;
  }
  if (p.routes === "assigned") {
    where.routes = { some: {} };
  } else if (p.routes === "unassigned") {
    where.routes = { none: {} };
  }
  return where;
}

function buildOrderBy(p: ParsedParams) {
  switch (p.sort) {
    case "name":
      return [{ name: p.dir }, { birthYear: "desc" as const }];
    case "school":
      return [{ school: p.dir }, { name: "asc" as const }];
    case "year":
    default:
      return [{ birthYear: p.dir }, { name: "asc" as const }];
  }
}

export async function listStudents(orgId: string, p: ParsedParams) {
  return db.student.findMany({
    where: buildWhere(orgId, p),
    orderBy: buildOrderBy(p),
    skip: (p.page - 1) * p.size,
    take: p.size,
    include: {
      _count: { select: { routes: true, guardians: true } },
    },
  });
}

export async function countStudents(
  orgId: string,
  p: ParsedParams,
): Promise<number> {
  return db.student.count({ where: buildWhere(orgId, p) });
}

export async function listSchools(orgId: string): Promise<string[]> {
  // 학생 100~500명 규모에서 distinct 비용 미미. 학교 드롭다운용.
  const rows = await db.student.findMany({
    where: { orgId, school: { not: null } },
    distinct: ["school"],
    select: { school: true },
    orderBy: { school: "asc" },
  });
  return rows
    .map((r) => r.school)
    .filter((s): s is string => typeof s === "string" && s.length > 0);
}

export type StudentRow = Awaited<ReturnType<typeof listStudents>>[number];

// 필터가 1개라도 적용됐는지 — 빈 결과 카드 분기 + 초기화 버튼 표시 판정.
export function hasActiveFilters(p: ParsedParams): boolean {
  return Boolean(p.q || p.grade || p.school || p.routes);
}
