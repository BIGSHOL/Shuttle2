"use client";

// W26-E: 정류장 list 검색·필터·정렬 toolbar.
// 학생 students-toolbar.tsx 패턴 mirror — searchParams를 single source of truth로.

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

import type { ParsedStopsParams } from "../_lib/query";

const SORT_OPTIONS: { value: ParsedStopsParams["sort"]; label: string }[] = [
  { value: "name", label: "이름" },
  { value: "radius", label: "반경" },
  { value: "routes", label: "노선 사용 수" },
];

const USAGE_OPTIONS: { value: ParsedStopsParams["usage"]; label: string }[] = [
  { value: "all", label: "전체 사용 상태" },
  { value: "used", label: "노선 배정됨" },
  { value: "unused", label: "노선 미배정" },
];

const ACTIVE_OPTIONS: { value: ParsedStopsParams["active"]; label: string }[] = [
  { value: "all", label: "전체 활성 상태" },
  { value: "active", label: "사용 중" },
  { value: "inactive", label: "미사용" },
];

const ADDRESS_OPTIONS: { value: ParsedStopsParams["address"]; label: string }[] = [
  { value: "all", label: "전체 주소 상태" },
  { value: "set", label: "주소 있음" },
  { value: "missing", label: "주소 미확인" },
];

export function StopsToolbar({ current }: { current: ParsedStopsParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const externalQ = current.q ?? "";
  const [searchInput, setSearchInput] = useState(externalQ);
  // 외부 URL 변경(뒤로가기·초기화) 시 input value 동기화 — render 중 prev 비교.
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
      p.delete("usage");
      p.delete("active");
      p.delete("address");
      p.delete("sort");
      p.delete("dir");
    });
  };

  const toggleDir = () => {
    setParam("dir", current.dir === "asc" ? "desc" : "asc");
  };

  const hasFilters =
    !!current.q ||
    current.usage !== "all" ||
    current.active !== "all" ||
    current.address !== "all" ||
    current.sort !== "name" ||
    current.dir !== "asc";

  return (
    <div className="bg-card flex flex-wrap items-center gap-2 rounded-lg border p-3 shadow-sm">
      {/* 검색 */}
      <div className="relative min-w-[200px] flex-1">
        <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          type="search"
          placeholder="이름·주소로 검색"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="h-9 pl-8"
        />
      </div>

      {/* 사용 여부 (RouteStop 배정 기준) */}
      <Select
        value={current.usage}
        onValueChange={(v) => setParam("usage", v)}
      >
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {USAGE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 활성 여부 (isActive flag) */}
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

      {/* 주소 상태 (카카오 reverse geocoding 결과 유무) */}
      <Select
        value={current.address}
        onValueChange={(v) => setParam("address", v)}
      >
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ADDRESS_OPTIONS.map((o) => (
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
