"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type StudentRow = {
  id: string;
  name: string;
  board: number;
  noShow: number;
  total: number;
  noShowRate: number;
};

type StatusFilter = "ALL" | "NORMAL" | "WATCH" | "COUNSEL";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "COUNSEL", label: "상담 권장" },
  { value: "WATCH", label: "관찰" },
  { value: "NORMAL", label: "정상" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

function statusOf(rate: number): StatusFilter {
  if (rate >= 30) return "COUNSEL";
  if (rate >= 10) return "WATCH";
  return "NORMAL";
}

function statusBadge(rate: number): { label: string; cls: string } {
  if (rate >= 30)
    return {
      label: "상담 권장",
      cls: "bg-destructive/10 text-destructive",
    };
  if (rate >= 10)
    return { label: "관찰", cls: "bg-warning-soft text-warning" };
  return { label: "정상", cls: "bg-success-soft text-success" };
}

export function StudentAttendanceTable({ rows }: { rows: StudentRow[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    10,
  );
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q)) return false;
      if (status !== "ALL" && statusOf(r.noShowRate) !== status) return false;
      return true;
    });
  }, [rows, search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  const visible = filtered.slice(start, end);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">학생 출석 분석</CardTitle>
        <CardDescription>
          최근 7일 탑승·미탑승 누적. 미탑승률 30% 이상은 보호자 상담 권장.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-0">
        {/* 검색·필터 */}
        <div className="flex flex-wrap items-center gap-2 px-4 pt-1">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="학생 이름 검색"
              className="h-9 pl-8 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {STATUS_OPTIONS.map((o) => (
              <Button
                key={o.value}
                type="button"
                size="sm"
                variant={status === o.value ? "default" : "outline"}
                className="h-8 px-2.5 text-xs font-bold"
                onClick={() => {
                  setStatus(o.value);
                  setPage(1);
                }}
              >
                {o.label}
              </Button>
            ))}
          </div>
        </div>

        {/* 표 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-[10px] font-extrabold tracking-wide uppercase">
              <tr>
                <th className="px-4 py-2 text-left">학생</th>
                <th className="px-2 py-2 text-right">탑승</th>
                <th className="px-2 py-2 text-right">미탑승</th>
                <th className="px-2 py-2 text-right">미탑승률</th>
                <th className="px-4 py-2 text-left">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visible.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-muted-foreground px-4 py-8 text-center text-xs font-semibold"
                  >
                    조건에 맞는 학생이 없어요.
                  </td>
                </tr>
              ) : (
                visible.map((s) => {
                  const badge = statusBadge(s.noShowRate);
                  return (
                    <tr key={s.id}>
                      <td className="px-4 py-2.5 font-bold tracking-tight">
                        {s.name}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums font-semibold">
                        {s.board}
                      </td>
                      <td
                        className={`px-2 py-2.5 text-right tabular-nums font-extrabold ${s.noShow > 0 ? "text-destructive" : ""}`}
                      >
                        {s.noShow}
                      </td>
                      <td
                        className={`px-2 py-2.5 text-right tabular-nums font-extrabold ${s.noShowRate >= 30 ? "text-destructive" : s.noShowRate >= 10 ? "text-warning" : ""}`}
                      >
                        {s.noShowRate}%
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
          <p className="text-muted-foreground text-[11px] font-semibold tabular-nums">
            전체 {filtered.length}명
            {filtered.length !== rows.length ? ` (필터 전 ${rows.length}명)` : ""}
            {filtered.length > 0 ? ` · ${start + 1}–${Math.min(end, filtered.length)} 표시` : ""}
          </p>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(
                  Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number],
                );
                setPage(1);
              }}
              className="border-input bg-background h-8 rounded-md border px-2 text-xs font-bold"
              aria-label="페이지 크기"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}개씩
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2 text-xs"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                이전
              </Button>
              <span className="text-xs font-extrabold tabular-nums">
                {safePage} / {totalPages}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2 text-xs"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                다음
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
