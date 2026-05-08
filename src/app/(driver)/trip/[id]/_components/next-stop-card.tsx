// W24-D Phase 2 driver: data/refac/screenshots/driver-run.jpg "02 · 운행 중 — 다음 정류장"
// .next-stop hero card. 운전 중 한눈에 다음 정류장을 알아야 하므로 stop 목록
// 위에 별도 큰 카드로 노출.
//
// refac:
//   <div class="next-stop">
//     <div class="next-stop-head">
//       <div class="label">다음 정류장</div>
//       <span>4번째 / 5</span>
//     </div>
//     <div class="body">
//       <div class="big-name">은빛마을 입구</div>
//       <div class="eta">
//         <div class="eta-num">2분</div>
//         <div class="eta-meta">도착 08:08 · 대기 2명</div>
//       </div>
//     </div>
//   </div>
//
// ETA(분)는 client-only(GPS 거리 기반)이라 page-level에서 계산해 prop 전달.
// 미보유면 — 표기.
export function NextStopCard({
  nextStopName,
  nextStopOrder, // 1-indexed
  totalStops,
  scheduledAt,
  waitingCount,
  etaMin,
}: {
  nextStopName: string;
  nextStopOrder: number;
  totalStops: number;
  scheduledAt: string; // "HH:mm"
  waitingCount: number;
  etaMin: number | null;
}) {
  return (
    <section className="bg-card rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-bus inline-flex items-center gap-1.5 text-[11px] font-black tracking-[0.06em] uppercase">
          <span className="bg-bus inline-block h-1.5 w-1.5 animate-pulse rounded-full" />
          다음 정류장
        </p>
        <span className="text-muted-foreground text-[11px] font-extrabold">
          {nextStopOrder}번째 / {totalStops}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-4">
        <p className="text-2xl font-black tracking-[-0.02em] leading-tight break-keep">
          {nextStopName}
        </p>
        <div className="border-border flex flex-col items-end gap-1 border-l pl-4 text-right">
          <p className="text-bus text-[34px] font-black tracking-[-0.04em] leading-none tabular-nums">
            {etaMin !== null ? (
              <>
                {etaMin}
                <span className="text-muted-foreground ml-0.5 text-base font-bold">
                  분
                </span>
              </>
            ) : (
              <span className="text-muted-foreground text-2xl">—</span>
            )}
          </p>
          <p className="text-muted-foreground text-[11px] font-bold leading-tight tabular-nums">
            도착 <span className="text-foreground font-extrabold">{scheduledAt}</span>
            {" · "}
            대기 <span className="text-foreground font-extrabold">{waitingCount}명</span>
          </p>
        </div>
      </div>
    </section>
  );
}
