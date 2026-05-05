import { formatDuration, type TripStats } from "@/lib/geo/trip-stats";

// W19-D: Trip 상세 통계 카드. 운행 중·종료 모두 표시.
// 운행 중일 때는 "지금까지" 누계 (실시간 자동 갱신은 W16 router.refresh로 처리됨).

export function TripStatsCard({
  stats,
  isRunning,
}: {
  stats: TripStats;
  isRunning: boolean;
}) {
  const items: { label: string; value: string; sub?: string }[] = [
    {
      label: "운행 시간",
      value: formatDuration(stats.durationSec),
      sub: isRunning ? "경과" : "총",
    },
    {
      label: "누적 거리",
      value: `${stats.distanceKm.toFixed(2)} km`,
      sub: `${stats.pingCount}개 좌표`,
    },
    {
      label: "평균 속도",
      value: stats.durationSec > 0 ? `${stats.avgSpeedKmh} km/h` : "-",
    },
    {
      label: "최대 속도",
      value:
        stats.maxSpeedKmh !== null ? `${stats.maxSpeedKmh} km/h` : "-",
    },
  ];

  return (
    <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold tracking-tight">운행 통계</h3>
          {isRunning ? (
            <span className="bg-bus-soft text-bus inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
              <span className="bg-bus inline-block h-1.5 w-1.5 animate-pulse rounded-full" />
              지금까지
            </span>
          ) : (
            <span className="bg-success-soft text-success rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase">
              완료
            </span>
          )}
        </div>
        <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
          GPS LocationPing 기반 — 30초 간격 + 정류장 통과·시작·종료 시점.
          {isRunning ? " 운행 종료 시 최종값 갱신." : ""}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="bg-card px-4 py-3">
            <p className="text-muted-foreground text-[10px] font-extrabold tracking-wide uppercase">
              {it.label}
            </p>
            <p className="mt-1 text-base font-extrabold tracking-tight">
              {it.value}
            </p>
            {it.sub ? (
              <p className="text-muted-foreground mt-0.5 text-[10px] font-medium">
                {it.sub}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
