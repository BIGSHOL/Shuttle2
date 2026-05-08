"use client";

import Link from "next/link";
import { useState } from "react";

// W24-B C2: 학생 timeline — 탭 (전체/탑승·하차/미탑승·미하차) + 표.
// 우리 schema(BoardingType: BOARD|ALIGHT|NO_SHOW|NO_DROPOFF)에 맞춤.

export type StudentEventRow = {
  eventId: string;
  type: "BOARD" | "ALIGHT" | "NO_SHOW" | "NO_DROPOFF";
  atISO: string;
  studentId: string;
  studentName: string;
  stopId: string | null;
  stopName: string | null;
  notes: string | null;
};

const TYPE_LABEL = {
  BOARD: "탑승",
  ALIGHT: "하차",
  NO_SHOW: "미탑승",
  NO_DROPOFF: "미하차",
} as const;

export function TripStudentTimeline({ events }: { events: StudentEventRow[] }) {
  const [tab, setTab] = useState<"all" | "processed" | "issue">("all");

  const all = events;
  const processed = events.filter(
    (e) => e.type === "BOARD" || e.type === "ALIGHT",
  );
  const issue = events.filter(
    (e) => e.type === "NO_SHOW" || e.type === "NO_DROPOFF",
  );

  const filtered =
    tab === "processed" ? processed : tab === "issue" ? issue : all;

  return (
    <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-extrabold tracking-tight">
            학생 처리 이벤트
          </h3>
          <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
            탑승·하차·미탑승·미하차 발생 시각 + 정류장.
          </p>
        </div>
        <div className="flex gap-1">
          <Tab active={tab === "all"} onClick={() => setTab("all")}>
            전체 ({all.length})
          </Tab>
          <Tab
            active={tab === "processed"}
            onClick={() => setTab("processed")}
          >
            처리 ({processed.length})
          </Tab>
          <Tab active={tab === "issue"} onClick={() => setTab("issue")}>
            미처리 ({issue.length})
          </Tab>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-muted-foreground p-8 text-center text-xs font-semibold">
          이벤트가 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-muted text-muted-foreground border-b">
                <Th>시각</Th>
                <Th>학생</Th>
                <Th>이벤트</Th>
                <Th>정류장</Th>
                <Th>비고</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const at = new Date(e.atISO);
                const time = new Intl.DateTimeFormat("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }).format(at);
                const isIssue =
                  e.type === "NO_SHOW" || e.type === "NO_DROPOFF";
                return (
                  <tr key={e.eventId} className="border-b last:border-b-0">
                    <td className="text-muted-foreground px-4 py-2.5 font-mono font-bold tabular-nums">
                      {time}
                    </td>
                    <td className="px-4 py-2.5 font-extrabold">
                      <Link
                        href={`/students/${e.studentId}`}
                        className="hover:text-info hover:underline"
                      >
                        {e.studentName}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      {isIssue ? (
                        <span className="bg-destructive/10 text-destructive rounded-md px-1.5 py-0.5 text-[10px] font-black tracking-[0.06em] uppercase">
                          {TYPE_LABEL[e.type]}
                        </span>
                      ) : (
                        <span className="bg-success-soft text-success rounded-md px-1.5 py-0.5 text-[10px] font-black tracking-[0.06em] uppercase">
                          {TYPE_LABEL[e.type]}
                        </span>
                      )}
                    </td>
                    <td className="text-muted-foreground px-4 py-2.5 font-semibold">
                      {e.stopId && e.stopName ? (
                        <Link
                          href={`/stops/${e.stopId}`}
                          className="text-info hover:underline"
                        >
                          {e.stopName}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="text-muted-foreground max-w-xs truncate px-4 py-2.5 text-[11px] font-medium">
                      {e.notes ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2.5 py-1.5 text-[11px] font-extrabold transition-colors ${
        active
          ? "bg-bus-soft text-bus-foreground"
          : "bg-muted text-muted-foreground hover:bg-border"
      }`}
    >
      {children}
    </button>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-[10px] font-extrabold tracking-[0.06em] uppercase">
      {children}
    </th>
  );
}
