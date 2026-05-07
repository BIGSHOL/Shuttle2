import { getTodayChildTrips } from "@/lib/parent/today-trips";
import { Skeleton } from "@/components/ui/skeleton";

import { IdleTripCard } from "./idle-trip-card";
import { LiveTripCard } from "./live-trip-card";

function fmtKstHHmm(d: Date): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(11, 16);
}

type StudentMeta = {
  id: string;
  name: string;
  org: { name: string; type: "ACADEMY" | "DAYCARE" | "KINDERGARTEN" };
};

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
      <section className="space-y-2.5 px-4">
        <p className="text-muted-foreground text-[11px] font-extrabold tracking-[0.1em] uppercase">
          오늘 운행
        </p>
        <div className="bg-card rounded-xl border p-6 text-center shadow-sm">
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

  return (
    <section className="space-y-2.5 px-4">
      <p className="text-muted-foreground text-[11px] font-extrabold tracking-[0.1em] uppercase">
        오늘 운행
      </p>
      {todayCards.flatMap((c) =>
        c.cards.map((card, i) => {
          const info = studentInfo.get(c.studentId);
          const orgName = info?.org.name ?? "";
          const orgType = info?.org.type ?? "ACADEMY";
          const key = `${c.studentId}-${i}`;

          if (card.kind === "running") {
            return (
              <LiveTripCard
                key={key}
                tripId={card.tripId}
                childName={c.studentName}
                orgName={orgName}
                direction={card.route.direction}
                routeName={card.route.name}
                childStopName={card.childStop.name}
              />
            );
          }
          if (card.kind === "scheduled") {
            return (
              <IdleTripCard
                key={key}
                kind="scheduled"
                childName={c.studentName}
                orgName={orgName}
                orgType={orgType}
                mode={card.route.vehicle.mode}
                routeName={card.route.name}
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
                childName={c.studentName}
                orgName={orgName}
                orgType={orgType}
                mode={card.route.vehicle.mode}
                routeName={card.route.name}
                direction={card.route.direction}
                endedAtKstHHmm={fmtKstHHmm(new Date(card.endedAtISO))}
              />
            );
          }
          return (
            <IdleTripCard
              key={key}
              kind="none"
              childName={c.studentName}
              orgName={orgName}
              orgType={orgType}
              mode="GENERAL"
              reason={card.reason}
            />
          );
        }),
      )}
    </section>
  );
}

export function TodayTripsSectionSkeleton() {
  return (
    <section className="space-y-2.5 px-4">
      <p className="text-muted-foreground text-[11px] font-extrabold tracking-[0.1em] uppercase">
        오늘 운행
      </p>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="bg-card space-y-3 rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-6 w-16 rounded-md" />
          </div>
          <Skeleton className="h-20 w-full rounded-md" />
        </div>
      ))}
    </section>
  );
}
