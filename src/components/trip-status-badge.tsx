import { Badge } from "@/components/ui/badge";

import { LivePulseDot } from "./live-pulse-dot";

// 학부모 home / trip-live에서 노출되는 운행 상태 배지.
// kind는 derive — Trip.startedAt/endedAt + BoardingEvent + AbsenceRequest로 결정.
export type TripStatusKind =
  | "scheduled" // 오늘 예정, 운행 시작 전
  | "running" // 진행 중 (LIVE)
  | "boarded" // 자녀 탑승 완료
  | "alighted" // 자녀 하차 완료
  | "absent" // 결석 신청 (해당 방향)
  | "ended"; // 오늘 운행 종료

const LABELS: Record<TripStatusKind, string> = {
  scheduled: "예정",
  running: "운행중",
  boarded: "탑승완료",
  alighted: "하차완료",
  absent: "결석",
  ended: "종료",
};

export function TripStatusBadge({
  kind,
  detail,
  className,
}: {
  kind: TripStatusKind;
  detail?: string;
  className?: string;
}) {
  const label = LABELS[kind];

  if (kind === "running") {
    return (
      <Badge
        className={`bg-bus text-bus-foreground border-bus inline-flex items-center gap-1.5 ${className ?? ""}`}
      >
        <LivePulseDot />
        {detail ? `${label} · ${detail}` : label}
      </Badge>
    );
  }

  if (kind === "boarded" || kind === "alighted") {
    return (
      <Badge
        className={`bg-success-soft text-success border-success-soft ${className ?? ""}`}
      >
        {detail ? `${label} · ${detail}` : label}
      </Badge>
    );
  }

  if (kind === "absent") {
    return (
      <Badge
        variant="secondary"
        className={`bg-muted text-muted-foreground ${className ?? ""}`}
      >
        {label}
      </Badge>
    );
  }

  // scheduled, ended
  return (
    <Badge variant="secondary" className={className}>
      {detail ? `${label} · ${detail}` : label}
    </Badge>
  );
}
