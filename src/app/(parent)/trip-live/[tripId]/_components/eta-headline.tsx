// W24-D Phase 1 trip-live: refac Parent App.html "02 · /trip-live" .live-eta.
// 픽셀 단위 align — refac CSS:
//
//   .live-eta{background:var(--card);border:1px solid var(--border);
//             border-radius:14px;padding:16px;text-align:center}
//   .live-eta .lbl{font-size:11px;font-weight:900;letter-spacing:0.06em;
//                  text-transform:uppercase;color:var(--muted-foreground)}
//   .live-eta .val{font-size:36px;font-weight:900;letter-spacing:-0.03em;
//                  line-height:1;margin-top:6px}
//   .live-eta .val .unit{font-size:18px;color:var(--muted-foreground);
//                        font-weight:700;margin-left:2px}
//   .live-eta .sub{font-size:12px;font-weight:700;color:var(--muted-foreground);
//                  margin-top:6px}
//   .live-eta .sub strong{color:var(--foreground);font-weight:900}

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
  childStopScheduledAt: string | null;
  stopsAhead: number | null;
}) {
  if (childPassed) {
    return (
      <div className="bg-card border-border rounded-[14px] border p-[16px] text-center">
        <p className="text-success bg-success-soft inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.06em]">
          ✓ 자녀 정류장 통과
        </p>
        <p className="mt-2 text-[20px] font-black tracking-[-0.02em] leading-tight">
          셔틀이 자녀 정류장을 지났어요
        </p>
        <p className="text-muted-foreground mt-1 text-[12px] font-bold">
          학원·기관 도착까지 곧이에요. 운행 종료 알림을 기다려 주세요.
        </p>
      </div>
    );
  }

  if (!hasPing) {
    return (
      <div className="bg-card border-border rounded-[14px] border p-[16px] text-center">
        <p className="text-muted-foreground text-[11px] font-black uppercase tracking-[0.06em]">
          현재 상태
        </p>
        <p className="mt-1.5 text-[28px] font-black tracking-[-0.02em] leading-none">
          신호 대기
        </p>
        <p className="text-muted-foreground mt-1.5 text-[12px] font-bold">
          셔틀이 운행을 시작하면 위치가 표시돼요
        </p>
      </div>
    );
  }

  if (etaMin === null) {
    return (
      <div className="bg-card border-border rounded-[14px] border p-[16px] text-center">
        <p className="text-muted-foreground text-[11px] font-black uppercase tracking-[0.06em]">
          {childName}이 정류장 도착까지
        </p>
        <p className="mt-1.5 text-[28px] font-black tracking-[-0.02em] leading-none">
          계산 중…
        </p>
        <p className="text-muted-foreground mt-1.5 text-[12px] font-bold">
          남은 정류장 정보를 모으고 있어요
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border-border rounded-[14px] border p-[16px] text-center">
      {/* refac .live-eta .lbl: 11px font-900 caps tracking-0.06em muted */}
      <p className="text-muted-foreground text-[11px] font-black uppercase tracking-[0.06em]">
        {childName}이 정류장 도착까지
      </p>
      {/* refac .live-eta .val: 36px font-900 tracking-(-0.03em) leading-1 mt-6px */}
      <p className="mt-1.5 text-[36px] font-black tracking-[-0.03em] leading-none tabular-nums">
        {etaMin}
        {/* .unit: 18px font-700 muted ml-2px */}
        <span className="text-muted-foreground ml-0.5 text-[18px] font-bold">
          분
        </span>
      </p>
      {/* refac .sub: 12px font-700 muted mt-6px, strong: foreground 900 */}
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
