import { getTodayChildTrips } from "@/lib/parent/today-trips";
import { Skeleton } from "@/components/ui/skeleton";

import { IdleTripCard } from "./idle-trip-card";
import { LiveTripCard } from "./live-trip-card";

// W24-D Phase 1 home: refac Parent App.html 구조와 align.
// - running 운행 1개 → 페이지 hero(첫 영역) — LiveTripCard 우선 렌더
// - 나머지(scheduled/finished/none) → "오늘 일정" 2-card grid (등원/하원 IdleTripCard)

function fmtKstHHmm(d: Date): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(11, 16);
}

export async function TodayTripsSection({
  students,
}: {
  students: { id: string; name: string }[];
}) {
  const todayCards = await getTodayChildTrips(students);

  if (todayCards.length === 0) {
    return (
      <section className="px-4">
        <div className="bg-card rounded-lg border p-6 text-center shadow-sm">
          <p className="text-base font-extrabold tracking-tight">
            연결된 자녀가 아직 없어요
          </p>
          <p className="text-muted-foreground mt-1.5 text-xs font-medium leading-relaxed">
            학원장·원장님께 보호자 초대를 다시 요청해 주세요.
          </p>
        </div>
      </section>
    );
  }

  // 첫 running 카드 → hero LIVE
  let liveCardEl: React.ReactNode = null;
  type IdleEntry = {
    key: string;
    card: Exclude<
      Awaited<ReturnType<typeof getTodayChildTrips>>[number]["cards"][number],
      { kind: "running" }
    >;
  };
  const idleEntries: IdleEntry[] = [];

  for (const c of todayCards) {
    for (let i = 0; i < c.cards.length; i++) {
      const card = c.cards[i];
      const key = `${c.studentId}-${i}`;
      if (card.kind === "running" && !liveCardEl) {
        liveCardEl = (
          // refac .hero { margin-top: 12px }
          <div key={key} className="mt-3 px-4">
            <LiveTripCard
              tripId={card.tripId}
              childName={c.studentName}
              direction={card.route.direction}
              routeName={card.route.name}
              childStopName={card.childStop.name}
              childStopScheduledAt={card.childStopScheduledAt}
              driverName={card.driverName}
              boardedCount={card.boardedCount}
              totalAssigned={card.totalAssigned}
              stopsAheadOfChild={card.stopsAheadOfChild}
            />
          </div>
        );
      } else if (card.kind !== "running") {
        idleEntries.push({ key, card });
      }
    }
  }

  return (
    <>
      {liveCardEl}

      {idleEntries.length > 0 ? (
        <section className="px-4">
          {/* refac .sec: mt-18px flex justify-between, h3 13px font-900 */}
          <div className="mt-[18px] flex items-center justify-between">
            <h3 className="text-[13px] font-black tracking-[-0.01em]">
              오늘 일정
            </h3>
          </div>
          {/* refac .sched: gap-8px mt-8px */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            {idleEntries.map(({ key, card }) => {
              if (card.kind === "scheduled") {
                return (
                  <IdleTripCard
                    key={key}
                    kind="scheduled"
                    direction={card.route.direction}
                    childStopName={card.childStop.name}
                    scheduledFirstAt={card.route.scheduledFirstAt}
                  />
                );
              }
              if (card.kind === "finished") {
                return (
                  <IdleTripCard
                    key={key}
                    kind="finished"
                    direction={card.route.direction}
                    childStopName={card.childStop.name}
                    endedAtKstHHmm={fmtKstHHmm(new Date(card.endedAtISO))}
                  />
                );
              }
              return (
                <IdleTripCard
                  key={key}
                  kind="none"
                  direction="PICKUP"
                  reason={card.reason}
                />
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}

export function TodayTripsSectionSkeleton() {
  return (
    <section className="px-4">
      <Skeleton className="mb-2 h-3.5 w-16" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-24 rounded-md" />
        <Skeleton className="h-24 rounded-md" />
      </div>
    </section>
  );
}
