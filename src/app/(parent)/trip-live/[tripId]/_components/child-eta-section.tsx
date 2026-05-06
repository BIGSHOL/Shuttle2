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
      <div className="bg-success-soft border-success/30 mt-4 rounded-md border px-3.5 py-3">
        <p className="text-success text-[10px] font-extrabold tracking-wide uppercase">
          자녀 정류장 도착 예상
        </p>
        <p className="text-foreground mt-1 font-mono text-2xl font-extrabold">
          {hhmm}
        </p>
        {diffLabel ? (
          <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
            {diffLabel} · 최근 {eta.sampleCount}건 평균 기반
          </p>
        ) : (
          <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
            최근 {eta.sampleCount}건 운행 평균 기반
          </p>
        )}
      </div>
    );
  }

  if (eta.scheduledAt) {
    return (
      <div className="bg-muted/40 mt-4 rounded-md px-3.5 py-3">
        <p className="text-muted-foreground text-[10px] font-extrabold tracking-wide uppercase">
          자녀 정류장 정시 도착
        </p>
        <p className="text-foreground mt-1 font-mono text-2xl font-extrabold">
          {eta.scheduledAt}
        </p>
        <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
          평균 도착 시각은 운행이 누적되면 표시돼요
        </p>
      </div>
    );
  }

  return null;
}
