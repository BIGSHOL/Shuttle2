"use client";

// W26-F: 노선 list 검색·필터·정렬 toolbar.
// 정류장 stops-toolbar.tsx와 디자인 통일 — 동일 컨트롤 layout·간격·아이콘.

import { useCallback, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { ParsedRoutesParams } from "../_lib/query";

const SORT_OPTIONS: { value: ParsedRoutesParams["sort"]; label: string }[] = [
  { value: "direction", label: "등원·하원" },
  { value: "name", label: "이름" },
  { value: "stops", label: "정류장 수" },
  { value: "students", label: "학생 수" },
];

const DIRECTION_OPTIONS: { value: ParsedRoutesParams["direction"]; label: string }[] = [
  { value: "all", label: "전체 등하원" },
  { value: "PICKUP", label: "등원만" },
  { value: "DROPOFF", label: "하원만" },
];

const ACTIVE_OPTIONS: { value: ParsedRoutesParams["active"]; label: string }[] = [
  { value: "all", label: "전체 활성 상태" },
  { value: "active", label: "사용 중" },
  { value: "inactive", label: "미사용" },
];

const MODE_OPTIONS: { value: ParsedRoutesParams["mode"]; label: string }[] = [
  { value: "all", label: "전체 차량 모드" },
  { value: "KIDS", label: "어린이용" },
  { value: "GENERAL", label: "일반용" },
];

export function RoutesToolbar({ current }: { current: ParsedRoutesParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const externalQ = current.q ?? "";
  const [searchInput, setSearchInput] = useState(externalQ);
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
        if (!value || value === "all") p.delete(key);
        else p.set(key, value);
      });
    },
    [replaceWith],
  );

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setParam("q", value.trim() || undefined);
    }, 300);
  };

  const handleReset = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchInput("");
    replaceWith((p) => {
      p.delete("q");
      p.delete("direction");
      p.delete("active");
      p.delete("mode");
      p.delete("sort");
      p.delete("dir");
    });
  };

  const toggleDir = () => {
    setParam("dir", current.dir === "asc" ? "desc" : "asc");
  };

  const hasFilters =
    !!current.q ||
    current.direction !== "all" ||
    current.active !== "all" ||
    current.mode !== "all" ||
    current.sort !== "direction" ||
    current.dir !== "asc";

  return (
    <div className="bg-card flex flex-wrap items-center gap-2 rounded-lg border p-3 shadow-sm">
      {/* 검색 */}
      <div className="relative min-w-[200px] flex-1">
        <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          type="search"
          placeholder="노선·차량번호로 검색"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="h-9 pl-8"
        />
      </div>

      {/* 등하원 */}
      <Select
        value={current.direction}
        onValueChange={(v) => setParam("direction", v)}
      >
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DIRECTION_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 활성 여부 */}
      <Select
        value={current.active}
        onValueChange={(v) => setParam("active", v)}
      >
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ACTIVE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 차량 모드 */}
      <Select
        value={current.mode}
        onValueChange={(v) => setParam("mode", v)}
      >
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MODE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 정렬 */}
      <Select
        value={current.sort}
        onValueChange={(v) => setParam("sort", v)}
      >
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={toggleDir}
        aria-label="정렬 방향"
      >
        {current.dir === "asc" ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )}
      </Button>

      {hasFilters ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          초기화
        </Button>
      ) : null}
    </div>
  );
}
