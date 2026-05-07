// W23-C 분리: client·server 양쪽에서 사용하는 상수·타입.
// _lib/query.ts는 server-only(`import "server-only"` + Prisma)이라
// client component(`students-toolbar` 등)가 직접 import하면 빌드 시
// fs·net·tls 같은 server-only 모듈을 client 번들로 끌어와 Module not found
// (Turbopack 빌드 실패) 발생. 이 파일은 순수 상수·타입만이라 양쪽 안전.

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

// ParsedParams는 zod schema가 server-only(query.ts)에 있어 type만 별도 export.
// query.ts에서 z.infer로 산출한 타입을 그대로 type-only re-export.
export type ParsedParams = {
  q?: string;
  grade?: GradeCategory;
  school?: string;
  routes?: RouteFilter;
  sort: SortKey;
  dir: SortDir;
  page: number;
  size: PageSize;
};
