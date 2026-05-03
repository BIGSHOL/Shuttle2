// 바텀시트 상단의 큰 ETA 헤드라인. lofi parent.jsx의 "약 4분" 큰 글씨 + sub.
// 자녀 stop이 통과되었으면 "통과" 메시지로 전환.
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
      <div className="space-y-1.5">
        <p className="text-bus-foreground bg-bus-soft inline-block rounded-full px-3 py-1 text-[11px] font-bold">
          자녀 정류장 통과
        </p>
        <p className="text-2xl font-extrabold tracking-tight">
          셔틀이 자녀 정류장을 지났어요
        </p>
        <p className="text-muted-foreground text-xs font-medium">
          학원·기관 도착까지 곧이에요. 운행 종료 알림을 기다려 주세요.
        </p>
      </div>
    );
  }

  if (!hasPing) {
    return (
      <div className="space-y-1.5">
        <p className="text-3xl font-extrabold tracking-tight">신호 대기</p>
        <p className="text-muted-foreground text-xs font-medium">
          셔틀이 운행을 시작하면 위치가 표시됩니다.
        </p>
      </div>
    );
  }

  if (!nextStopName || etaMin === null) {
    return (
      <div className="space-y-1.5">
        <p className="text-3xl font-extrabold tracking-tight">계산 중</p>
        <p className="text-muted-foreground text-xs font-medium">
          남은 정류장 정보를 모으고 있어요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-3">
      <p className="text-4xl font-extrabold tracking-tighter leading-none tabular-nums">
        약 {etaMin}분
      </p>
      <div className="flex-1 pb-1">
        <p className="text-muted-foreground text-[11px] font-bold">
          다음 정류장
        </p>
        <p className="mt-0.5 text-sm font-bold tracking-tight">
          {nextStopName}
        </p>
        <p className="text-muted-foreground mt-1 text-[10px] font-medium">
          {etaSource === "kakao" ? "카카오 길찾기" : "직선거리 추정"}
        </p>
      </div>
    </div>
  );
}
