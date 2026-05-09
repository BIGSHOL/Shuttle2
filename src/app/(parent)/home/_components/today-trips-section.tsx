import Link from "next/link";
import { ChevronRight, Sunrise, Sunset } from "lucide-react";

import {
  getTodayChildTrips,
  type ChildTodaySummary,
} from "@/lib/parent/today-trips";
import { Skeleton } from "@/components/ui/skeleton";

import { LiveTripCard } from "./live-trip-card";

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

type StudentMeta = {
  id: string;
  name: string;
  org: { name: string; type: "ACADEMY" | "DAYCARE" | "KINDERGARTEN" };
};

// W25 P0-A: ground truth Parent App.html §1번 frame 구조.
// 1. 운행 중 자녀가 1명+ 있으면 노란 hero 카드 (가장 가까운 1개만)
// 2. "우리 아이" — 자녀 카드 list (avatar + 이름 + 모드 배지 + meta + chevron)
// 3. "오늘 일정" — mini 2-grid (자녀별 등원·하원 정류장+시각)
export async function TodayTripsSection({
  students,
  studentInfo,
}: {
  students: { id: string; name: string }[];
  studentInfo: Map<string, StudentMeta>;
}) {
  const todayCards = await getTodayChildTrips(students);

  if (todayCards.length === 0) {
    return (
      <section className="px-4">
        <div className="bg-card rounded-lg border p-6 text-center shadow-sm">
          <p className="text-base font-extrabold tracking-tight">
            연결된 자녀가 아직 없어요
          </p>
          <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed font-medium">
            학원장·원장님께 보호자 초대를 다시 요청해 주세요.
          </p>
        </div>
      </section>
    );
  }

  // 운행 중인 첫 trip을 hero에. 자녀가 여러 명이거나 등원·하원 모두 진행 중이면
  // 첫 1개만 hero, 나머지는 list로.
  const allRunning = todayCards.flatMap((c) =>
    c.cards
      .filter((card) => card.kind === "running")
      .map((card) => ({ studentName: c.studentName, card })),
  );
  const heroEntry = allRunning[0];
  const hero =
    heroEntry && heroEntry.card.kind === "running" ? heroEntry : null;

  return (
    <>
      {hero ? (
        <LiveTripCard
          tripId={hero.card.tripId}
          childName={hero.studentName}
          direction={hero.card.route.direction}
          routeName={hero.card.route.name}
          childStopName={hero.card.childStop.name}
          childStopScheduledAt={hero.card.childStop.scheduledAt}
          details={hero.card.details}
        />
      ) : null}

      {/* 우리 아이 */}
      <ChildSection summaries={todayCards} studentInfo={studentInfo} />

      {/* 오늘 일정 */}
      <SchedSection summaries={todayCards} />
    </>
  );
}

// 자녀 카드 list — "우리 아이" 섹션
function ChildSection({
  summaries,
  studentInfo,
}: {
  summaries: ChildTodaySummary[];
  studentInfo: Map<string, StudentMeta>;
}) {
  return (
    <section className="px-4">
      <header className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-black tracking-tight">우리 아이</h3>
      </header>
      <ul className="space-y-2">
        {summaries.map((s) => {
          const info = studentInfo.get(s.studentId);
          if (!info) return null;
          // 자녀의 첫 노선 (등원 우선) 정보
          const firstCard = s.cards.find((c) => c.kind !== "none") as
            | Exclude<(typeof s.cards)[number], { kind: "none" }>
            | undefined;
          const isKids = firstCard
            ? firstCard.route.vehicle.mode === "KIDS"
            : false;
          const meta = firstCard
            ? `${info.org.name} · ${firstCard.route.name}`
            : info.org.name;
          return (
            <li key={s.studentId}>
              <Link
                href={`/my-absences/new?studentId=${s.studentId}`}
                className="bg-card hover:bg-muted/40 flex items-center gap-3 rounded-lg border p-3 shadow-sm transition-colors"
              >
                <span className="bg-info-soft text-info border-info/30 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-black">
                  {s.studentName.trim().slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-black tracking-tight">
                      {s.studentName}
                    </p>
                    {isKids ? (
                      <span className="bg-bus text-bus-foreground rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                        어린이용
                      </span>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground mt-0.5 truncate text-[11px] font-bold">
                    {meta}
                  </p>
                </div>
                <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// 오늘 일정 mini grid — 자녀별 등원·하원 정류장+시각 2-grid
function SchedSection({ summaries }: { summaries: ChildTodaySummary[] }) {
  // 자녀 1명일 때는 ground truth와 동일 — 등원/하원 2-grid.
  // 자녀 2명+일 때는 자녀명 prefix + 4-grid.
  const items: {
    studentName: string;
    direction: "PICKUP" | "DROPOFF";
    stopName: string;
    timeLabel: string;
    showName: boolean;
  }[] = [];
  const multiChild = summaries.length > 1;

  for (const s of summaries) {
    for (const card of s.cards) {
      if (card.kind === "none") continue;
      const stopName = card.childStop.name;
      let timeLabel = "—";
      if (card.kind === "running") {
        timeLabel = card.childStop.scheduledAt
          ? `${card.childStop.scheduledAt} 도착`
          : "운행 중";
      } else if (card.kind === "scheduled") {
        timeLabel = card.childStop.scheduledAt
          ? `${card.childStop.scheduledAt} 예정`
          : "—";
      } else if (card.kind === "finished") {
        timeLabel = "운행 완료";
      }
      items.push({
        studentName: s.studentName,
        direction: card.route.direction,
        stopName,
        timeLabel,
        showName: multiChild,
      });
    }
  }

  if (items.length === 0) return null;

  return (
    <section className="px-4">
      <h3 className="mb-2 text-sm font-black tracking-tight">오늘 일정</h3>
      <ul className="grid grid-cols-2 gap-2">
        {items.map((it, idx) => {
          const Icon = it.direction === "PICKUP" ? Sunrise : Sunset;
          return (
            <li
              key={`${it.studentName}-${it.direction}-${idx}`}
              className="bg-muted/60 rounded-md p-3"
            >
              <div className="text-muted-foreground flex items-center gap-1 text-[10px] font-black tracking-wide uppercase">
                <Icon className="h-3 w-3" />
                <span>
                  {it.showName ? `${it.studentName} · ` : ""}
                  {DIRECTION_LABEL[it.direction]}
                </span>
              </div>
              <p className="mt-1 truncate text-[13px] font-extrabold tracking-tight">
                {it.stopName}
              </p>
              <p className="text-foreground mt-0.5 text-sm font-black tabular-nums">
                {it.timeLabel}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function TodayTripsSectionSkeleton() {
  return (
    <section className="space-y-2.5 px-4">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-16 w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-20 rounded-md" />
        <Skeleton className="h-20 rounded-md" />
      </div>
    </section>
  );
}
