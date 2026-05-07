import { getChildStopEta } from "@/lib/eta/route-stats";

// 자녀 정류장 도착 예상 카드 — 학습된 평균 vs 정시 비교.
// Server component — getChildStopEta는 RouteStop 평균 통과 분 계산이라 무거움.
// 부모 page에서 Suspense로 감싸 streaming.
export async function ChildEtaSection({
  tripId,
  routeId,
  childStopId,
  startedAtMs,
}: {
  tripId: string;
  routeId: string;
  childStopId: string;
  startedAtMs: number;
}) {
  const eta = await getChildStopEta({
    tripId,
    routeId,
    childStopId,
    startedAtMs,
  });

  if (!eta || eta.passed) return null;

  // sampleCount가 충분(>= 3)하고 predictedAtMs 있으면 학습 평균 표시.
  // 그 외에는 RouteStop.scheduledAt 기반 정시 안내 또는 "데이터 부족".
  if (eta.predictedAtMs !== null) {
    const kst = new Date(eta.predictedAtMs + 9 * 60 * 60 * 1000);
    const hhmm = kst.toISOString().slice(11, 16);

    let diffLabel: string | null = null;
    if (eta.scheduledAt) {
      const [sh, sm] = eta.scheduledAt.split(":").map(Number);
      const predHour = kst.getUTCHours();
      const predMin = kst.getUTCMinutes();
      const diffMin =
        predHour * 60 + predMin - ((sh ?? 0) * 60 + (sm ?? 0));
      if (Math.abs(diffMin) >= 1) {
        diffLabel =
          diffMin > 0 ? `정시보다 +${diffMin}분` : `정시보다 ${diffMin}분`;
      } else {
        diffLabel = "정시 도착 예상";
      }
    }

    return (
      <div className="bg-success-soft border-success/40 mt-4 rounded-xl border-2 px-4 py-3.5 shadow-sm relative overflow-hidden">
        <div className="from-success/15 pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br to-transparent blur-2xl" />
        <div className="relative">
          <p className="text-success text-[10px] font-extrabold tracking-[0.1em] uppercase flex items-center gap-1.5">
            <span className="bg-success h-1.5 w-1.5 rounded-full" />
            자녀 정류장 도착 예상
          </p>
          <p className="text-foreground mt-1.5 font-mono text-3xl font-black tracking-tight tabular-nums">
            {hhmm}
          </p>
          {diffLabel ? (
            <p className="text-foreground/70 mt-1 text-[11px] font-semibold">
              {diffLabel} · 최근 {eta.sampleCount}건 평균 기반
            </p>
          ) : (
            <p className="text-foreground/70 mt-1 text-[11px] font-semibold">
              최근 {eta.sampleCount}건 운행 평균 기반
            </p>
          )}
        </div>
      </div>
    );
  }

  if (eta.scheduledAt) {
    return (
      <div className="bg-muted/50 border border-border mt-4 rounded-xl px-4 py-3.5">
        <p className="text-muted-foreground text-[10px] font-extrabold tracking-[0.1em] uppercase flex items-center gap-1.5">
          <span className="bg-muted-foreground/40 h-1.5 w-1.5 rounded-full" />
          자녀 정류장 정시 도착
        </p>
        <p className="text-foreground mt-1.5 font-mono text-3xl font-black tracking-tight tabular-nums">
          {eta.scheduledAt}
        </p>
        <p className="text-muted-foreground mt-1 text-[11px] font-semibold">
          평균 도착 시각은 운행이 누적되면 표시돼요
        </p>
      </div>
    );
  }

  return null;
}
