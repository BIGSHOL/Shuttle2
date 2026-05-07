"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import {
  GRADE_CATEGORIES,
  GRADE_LABELS,
  PAGE_SIZES,
  type ParsedParams,
} from "../_lib/constants";

const ALL = "__all__";

const SORT_OPTIONS: { value: ParsedParams["sort"]; label: string }[] = [
  { value: "year", label: "학년" },
  { value: "name", label: "이름" },
  { value: "school", label: "학교" },
];

const ROUTE_OPTIONS: { value: NonNullable<ParsedParams["routes"]>; label: string }[] = [
  { value: "assigned", label: "노선 배정됨" },
  { value: "unassigned", label: "노선 미배정" },
];

export function StudentsToolbar({
  schools,
  current,
  termLabel,
}: {
  schools: string[];
  current: ParsedParams;
  termLabel: "학생" | "원아";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const externalQ = current.q ?? "";
  const [searchInput, setSearchInput] = useState(externalQ);
  // 외부 URL 변경(뒤로가기·초기화 등) 시 input value 동기화 — React 19 권장
  // 패턴: render 중 prev 비교 후 setState. ref 대신 state로 추적해야 lint 통과.
  const [prevExternalQ, setPrevExternalQ] = useState(externalQ);
  if (prevExternalQ !== externalQ) {
    setPrevExternalQ(externalQ);
    setSearchInput(externalQ);
  }
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const replaceWith = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString());
      mutate(next);
      const qs = next.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      startTransition(() => {
        router.replace(url, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const setParam = useCallback(
    (key: string, value: string | undefined) => {
      replaceWith((p) => {
        if (value && value !== ALL) p.set(key, value);
        else p.delete(key);
        // 필터·검색·페이지사이즈 변경 시 page 1로 reset
        if (key !== "sort" && key !== "dir" && key !== "page") {
          p.delete("page");
        }
      });
    },
    [replaceWith],
  );

  const onSearchChange = (v: string) => {
    setSearchInput(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = v.trim();
      setParam("q", trimmed.length > 0 ? trimmed : undefined);
    }, 350);
  };

  const onResetAll = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchInput("");
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  };

  const toggleDir = () => {
    setParam("dir", current.dir === "asc" ? "desc" : "asc");
  };

  const hasAnyFilter = Boolean(
    current.q || current.grade || current.school || current.routes,
  );

  return (
    <section
      aria-label={`${termLabel} 검색·필터`}
      className={cn(
        "bg-card rounded-lg border p-3 transition-opacity",
        isPending && "opacity-70",
      )}
    >
      {/* 검색·필터·정렬·페이지·초기화 한 줄 (좁은 폭에서는 자동 wrap) */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 검색 */}
        <div className="relative w-full sm:w-64">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`${termLabel} 이름·학교 검색`}
            className="pl-8"
            maxLength={50}
          />
        </div>

        {/* 학년 */}
        <Select
          value={current.grade ?? ALL}
          onValueChange={(v) => setParam("grade", v)}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="학년 전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>학년 전체</SelectItem>
            <SelectSeparator />
            {GRADE_CATEGORIES.filter((g) => g !== "kids").map((g) => (
              <SelectItem key={g} value={g}>
                {GRADE_LABELS[g]}
              </SelectItem>
            ))}
            <SelectSeparator />
            <SelectItem value="kids">{GRADE_LABELS.kids}</SelectItem>
          </SelectContent>
        </Select>

        {/* 학교 */}
        <Select
          value={current.school ?? ALL}
          onValueChange={(v) => setParam("school", v)}
          disabled={schools.length === 0}
        >
          <SelectTrigger className="w-40">
            <SelectValue
              placeholder={schools.length === 0 ? "학교 없음" : "학교 전체"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>학교 전체</SelectItem>
            {schools.length > 0 ? <SelectSeparator /> : null}
            {schools.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 노선 배정 */}
        <Select
          value={current.routes ?? ALL}
          onValueChange={(v) => setParam("routes", v)}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="노선 전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>노선 전체</SelectItem>
            <SelectSeparator />
            {ROUTE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 정렬 + 방향 */}
        <div className="flex items-center gap-1">
          <Select
            value={current.sort}
            onValueChange={(v) => setParam("sort", v)}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label} 순
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={toggleDir}
            aria-label={
              current.dir === "asc"
                ? "오름차순 (클릭 시 내림차순)"
                : "내림차순 (클릭 시 오름차순)"
            }
            title={current.dir === "asc" ? "오름차순" : "내림차순"}
          >
            {current.dir === "asc" ? (
              <ArrowUp className="size-3.5" />
            ) : (
              <ArrowDown className="size-3.5" />
            )}
          </Button>
        </div>

        {/* 페이지 사이즈 */}
        <Select
          value={String(current.size)}
          onValueChange={(v) => setParam("size", v)}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}명씩
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 초기화 — 활성 필터 있을 때만, 우측 정렬 */}
        {hasAnyFilter ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetAll}
            className="ml-auto"
          >
            <RotateCcw className="size-3.5" />
            초기화
          </Button>
        ) : null}
      </div>

      {/* a11y — 검색 진행 중 안내 */}
      <span className="sr-only" aria-live="polite">
        {isPending ? "결과 갱신 중" : ""}
      </span>

      {/* 직접 링크 — JS 비활성 환경에서도 초기화 가능 (progressive enhancement) */}
      <noscript>
        <Link href={pathname} className="text-primary text-xs underline">
          필터 초기화
        </Link>
      </noscript>
    </section>
  );
}
