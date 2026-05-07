import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

import type { ParsedParams } from "../_lib/query";

type PageItem =
  | { type: "page"; page: number }
  | { type: "ellipsis"; key: string };

// 1, 현재±2, 마지막 + 사이가 1 초과하면 "...".
function buildPageItems(current: number, total: number): PageItem[] {
  if (total <= 1) return [{ type: "page", page: 1 }];

  const pages = new Set<number>([1, total]);
  for (let i = current - 2; i <= current + 2; i++) {
    if (i >= 1 && i <= total) pages.add(i);
  }
  const sorted = [...pages].sort((a, b) => a - b);

  const items: PageItem[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev > 0 && p - prev > 1) {
      items.push({ type: "ellipsis", key: `e-${prev}-${p}` });
    }
    items.push({ type: "page", page: p });
    prev = p;
  }
  return items;
}

// page param만 바꾸고 다른 필터·정렬은 유지하는 URL 빌더.
function buildHref(current: ParsedParams, page: number): string {
  const params = new URLSearchParams();
  if (current.q) params.set("q", current.q);
  if (current.grade) params.set("grade", current.grade);
  if (current.school) params.set("school", current.school);
  if (current.routes) params.set("routes", current.routes);
  if (current.sort !== "year") params.set("sort", current.sort);
  if (current.dir !== "desc") params.set("dir", current.dir);
  if (current.size !== 20) params.set("size", String(current.size));
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/students?${qs}` : "/students";
}

export function StudentsPagination({
  current,
  total,
  termLabel,
}: {
  current: ParsedParams;
  total: number;
  termLabel: "학생" | "원아";
}) {
  const totalPages = Math.max(1, Math.ceil(total / current.size));
  const page = Math.min(current.page, totalPages);
  const start = total === 0 ? 0 : (page - 1) * current.size + 1;
  const end = Math.min(page * current.size, total);

  const items = buildPageItems(page, totalPages);
  const showNav = totalPages > 1;

  return (
    <nav
      aria-label={`${termLabel} 페이지 이동`}
      className="flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p className="text-muted-foreground text-xs font-medium">
        {total === 0
          ? `0명`
          : `${start.toLocaleString()}-${end.toLocaleString()} / 총 ${total.toLocaleString()}명`}
      </p>

      {showNav ? (
        <ul className="flex items-center gap-1">
          <li>
            {page > 1 ? (
              <Link
                href={buildHref(current, page - 1)}
                rel="prev"
                aria-label="이전 페이지"
                className="border-border hover:bg-muted text-foreground inline-flex h-8 items-center gap-0.5 rounded-md border px-2 text-xs font-medium transition-colors"
              >
                <ChevronLeft className="size-3.5" />
                이전
              </Link>
            ) : (
              <span
                aria-disabled
                className="border-border text-muted-foreground/50 inline-flex h-8 cursor-not-allowed items-center gap-0.5 rounded-md border px-2 text-xs font-medium"
              >
                <ChevronLeft className="size-3.5" />
                이전
              </span>
            )}
          </li>

          {items.map((item) =>
            item.type === "ellipsis" ? (
              <li
                key={item.key}
                className="text-muted-foreground px-1 text-xs"
                aria-hidden
              >
                …
              </li>
            ) : (
              <li key={item.page}>
                {item.page === page ? (
                  <span
                    aria-current="page"
                    className={cn(
                      "bg-primary text-primary-foreground inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-bold",
                    )}
                  >
                    {item.page}
                  </span>
                ) : (
                  <Link
                    href={buildHref(current, item.page)}
                    aria-label={`${item.page}페이지`}
                    className="border-border hover:bg-muted text-foreground inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors"
                  >
                    {item.page}
                  </Link>
                )}
              </li>
            ),
          )}

          <li>
            {page < totalPages ? (
              <Link
                href={buildHref(current, page + 1)}
                rel="next"
                aria-label="다음 페이지"
                className="border-border hover:bg-muted text-foreground inline-flex h-8 items-center gap-0.5 rounded-md border px-2 text-xs font-medium transition-colors"
              >
                다음
                <ChevronRight className="size-3.5" />
              </Link>
            ) : (
              <span
                aria-disabled
                className="border-border text-muted-foreground/50 inline-flex h-8 cursor-not-allowed items-center gap-0.5 rounded-md border px-2 text-xs font-medium"
              >
                다음
                <ChevronRight className="size-3.5" />
              </span>
            )}
          </li>
        </ul>
      ) : null}
    </nav>
  );
}
