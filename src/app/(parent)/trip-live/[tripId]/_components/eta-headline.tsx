// 바텀시트 상단의 큰 ETA 헤드라인. lofi parent.jsx의 "약 4분" 큰 글씨 + sub.
// 자녀 stop이 통과되었으면 "통과" 메시지로 전환.
// data/03 phase-1 trip-live.md 가이드 적용 — 영웅감·라벨 위계·NEXT 박스.
export function EtaHeadline({
  childPassed,
  nextStopName,
  etaMin,
  etaSource,
  hasPing,
}: {
  childPassed: boolean;
  nextStopName: string | null;
  etaMin: number | null;
  etaSource: "kakao" | "haversine" | null;
  hasPing: boolean;
}) {
  if (childPassed) {
    return (
      <div className="space-y-2">
        <p className="bg-success text-success-foreground inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-extrabold tracking-tight">
          ✓ 자녀 정류장 통과
        </p>
        <p className="text-2xl font-extrabold tracking-tight leading-tight">
          셔틀이 자녀 정류장을 지났어요
        </p>
        <p className="text-muted-foreground text-xs font-medium leading-relaxed">
          학원·기관 도착까지 곧이에요. 운행 종료 알림을 기다려 주세요.
        </p>
      </div>
    );
  }

  if (!hasPing) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground text-[10px] font-extrabold tracking-[0.1em] uppercase">
          현재 상태
        </p>
        <p className="text-3xl font-black tracking-tight">신호 대기</p>
        <p className="text-muted-foreground text-xs font-medium leading-relaxed">
          셔틀이 운행을 시작하면 위치가 표시됩니다.
        </p>
      </div>
    );
  }

  if (!nextStopName || etaMin === null) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground text-[10px] font-extrabold tracking-[0.1em] uppercase">
          도착 예상
        </p>
        <p className="text-3xl font-black tracking-tight">계산 중…</p>
        <p className="text-muted-foreground text-xs font-medium leading-relaxed">
          남은 정류장 정보를 모으고 있어요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <p className="text-muted-foreground text-[10px] font-extrabold tracking-[0.1em] uppercase">
        도착 예상
      </p>
      <div className="flex items-baseline gap-2">
        <p className="text-foreground text-[44px] font-black tracking-tighter leading-none tabular-nums">
          약 {etaMin}
        </p>
        <p className="text-foreground text-2xl font-extrabold tracking-tight">
          분
        </p>
        <span className="ml-1 inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
          {etaSource === "kakao" ? "카카오 길찾기" : "직선 추정"}
        </span>
      </div>
      <div className="bg-muted/40 border border-border/60 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
        <div className="bg-bus border-2 border-bus-foreground/20 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-bus-foreground font-black text-[10px]">
          NEXT
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wide">
            다음 정류장
          </p>
          <p className="text-foreground text-sm font-extrabold tracking-tight truncate">
            {nextStopName}
          </p>
        </div>
      </div>
    </div>
  );
}
