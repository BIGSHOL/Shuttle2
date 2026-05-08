// W24-D Phase 1 trip-live: data/refac/screenshots/parent-app.jpg "02 · /trip-live"
// .live-eta 카드 reproduce. refac:
//   <div class="lbl">도현이 정류장 도착까지</div>
//   <div class="val">5<span class="unit">분</span></div>
//   <div class="sub">예상 도착 <strong>08:00</strong> · 2정류장 남음</div>
//
// 자녀 stop 통과·신호 대기·계산 중 등 fallback 분기는 그대로 보존, 정상 경우만
// hi-fi big number 카드로 표시.
export function EtaHeadline({
  childName,
  childPassed,
  etaMin,
  etaSource,
  hasPing,
  childStopScheduledAt,
  stopsAhead,
}: {
  childName: string;
  childPassed: boolean;
  etaMin: number | null;
  etaSource: "kakao" | "haversine" | null;
  hasPing: boolean;
  childStopScheduledAt: string | null; // "HH:mm"
  stopsAhead: number | null;
}) {
  if (childPassed) {
    return (
      <div className="bg-card rounded-lg border p-4 text-center">
        <p className="text-success inline-flex items-center gap-1 rounded-full bg-success-soft px-3 py-1 text-[11px] font-extrabold tracking-tight">
          ✓ 자녀 정류장 통과
        </p>
        <p className="mt-2 text-xl font-black tracking-tight leading-tight">
          셔틀이 자녀 정류장을 지났어요
        </p>
        <p className="text-muted-foreground mt-1 text-xs font-medium leading-relaxed">
          학원·기관 도착까지 곧이에요. 운행 종료 알림을 기다려 주세요.
        </p>
      </div>
    );
  }

  if (!hasPing) {
    return (
      <div className="bg-card rounded-lg border p-4 text-center">
        <p className="text-muted-foreground text-[11px] font-black tracking-[0.06em] uppercase">
          현재 상태
        </p>
        <p className="mt-1.5 text-3xl font-black tracking-tight">신호 대기</p>
        <p className="text-muted-foreground mt-1.5 text-[12px] font-bold">
          셔틀이 운행을 시작하면 위치가 표시돼요
        </p>
      </div>
    );
  }

  if (etaMin === null) {
    return (
      <div className="bg-card rounded-lg border p-4 text-center">
        <p className="text-muted-foreground text-[11px] font-black tracking-[0.06em] uppercase">
          {childName}이 정류장 도착까지
        </p>
        <p className="mt-1.5 text-3xl font-black tracking-tight">계산 중…</p>
        <p className="text-muted-foreground mt-1.5 text-[12px] font-bold">
          남은 정류장 정보를 모으고 있어요
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border p-4 text-center">
      <p className="text-muted-foreground text-[11px] font-black tracking-[0.06em] uppercase">
        {childName}이 정류장 도착까지
      </p>
      <p className="mt-1 text-[36px] font-black tracking-[-0.03em] leading-none tabular-nums">
        {etaMin}
        <span className="text-muted-foreground ml-0.5 text-lg font-bold">
          분
        </span>
      </p>
      <p className="text-muted-foreground mt-1.5 text-[12px] font-bold">
        {childStopScheduledAt ? (
          <>
            예상 도착{" "}
            <span className="text-foreground font-black">
              {childStopScheduledAt}
            </span>
            {stopsAhead !== null && stopsAhead > 0
              ? ` · ${stopsAhead}정류장 남음`
              : stopsAhead === 0
                ? " · 곧 도착"
                : ""}
          </>
        ) : (
          <>
            {stopsAhead !== null && stopsAhead > 0
              ? `${stopsAhead}정류장 남음`
              : stopsAhead === 0
                ? "곧 도착"
                : ""}
            {etaSource === "kakao"
              ? " · 카카오 길찾기 기준"
              : " · 직선 거리 기준"}
          </>
        )}
      </p>
    </div>
  );
}
