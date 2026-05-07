// 학원장 학생 목록 페이지 — searchParams 파싱 + Prisma 쿼리 빌드.
// W23-C에 추가. zod로 URL 파라미터 검증, gradeRange로 학년 카테고리 → birthYear 변환.
//
// 5단계 학년 카테고리(미취학·초·중·고·대학·성인) + "어린이용 모드(만 13세 미만)" 토글.
// gradeFromBirthYear()의 schoolYear 규칙(3월 1일 새 학년)과 동일.

import "server-only";

import { z } from "zod";

import { db } from "@/lib/db";

export const SORT_KEYS = ["name", "year", "school"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_DIRS = ["asc", "desc"] as const;
export type SortDir = (typeof SORT_DIRS)[number];

export const PAGE_SIZES = [10, 20, 50] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export const GRADE_CATEGORIES = [
  "pre", // 미취학 (만 0~6세)
  "elem", // 초등 (만 7~12세)
  "mid", // 중등 (만 13~15세)
  "high", // 고등 (만 16~18세)
  "adult", // 대학·성인 (만 19세+)
  "kids", // 어린이용 모드 대상 (만 13세 미만)
] as const;
export type GradeCategory = (typeof GRADE_CATEGORIES)[number];

export const GRADE_LABELS: Record<GradeCategory, string> = {
  pre: "미취학",
  elem: "초등",
  mid: "중등",
  high: "고등",
  adult: "대학·성인",
  kids: "어린이용 모드 (만 13세 미만)",
};

export const ROUTE_FILTERS = ["assigned", "unassigned"] as const;
export type RouteFilter = (typeof ROUTE_FILTERS)[number];

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

export type ParsedParams = z.infer<typeof studentsParamsSchema>;

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
