import { Sunrise, Sunset } from "lucide-react";

// W24-D Phase 1 home: refac Parent App.html "오늘 일정" 섹션 sched-item idiom.
// `<div class="sched"><div class="sched-item">lbl + stop + time</div>×2</div>`
//
// refac 디자인:
// - 2-card grid (1fr 1fr · gap 8px)
// - 각 card: bg-muted, rounded-md, padding 10px
// - lbl: 작은 캡스 + 일출/일몰 아이콘 + "등원"/"하원"
// - stop: 13px 800
// - time: 14px 900 tabular-nums
//
// running·finished·none 상태도 같은 sched-item idiom으로 표시.

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

export type IdleCardProps =
  | {
      kind: "scheduled";
      direction: "PICKUP" | "DROPOFF";
      childStopName: string;
      scheduledFirstAt: string | null;
    }
  | {
      kind: "finished";
      direction: "PICKUP" | "DROPOFF";
      childStopName: string;
      endedAtKstHHmm: string;
    }
  | {
      kind: "none";
      direction: "PICKUP" | "DROPOFF";
      reason: "no_route" | "off_day";
    };

export function IdleTripCard(props: IdleCardProps) {
  const Icon = props.direction === "PICKUP" ? Sunrise : Sunset;
  const directionLabel = DIRECTION_LABEL[props.direction];

  return (
    <div className="bg-muted rounded-md p-3">
      <div className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-black tracking-[0.04em] uppercase">
        <Icon className="h-3 w-3" />
        {directionLabel}
      </div>
      {props.kind === "scheduled" ? (
        <>
          <p className="mt-1 truncate text-[13px] font-extrabold">
            {props.childStopName}
          </p>
          <p className="mt-0.5 text-sm font-black tabular-nums">
            {props.scheduledFirstAt ?? "—"} 도착
          </p>
        </>
      ) : null}
      {props.kind === "finished" ? (
        <>
          <p className="mt-1 truncate text-[13px] font-extrabold">
            {props.childStopName}
          </p>
          <p className="text-success mt-0.5 text-sm font-black tabular-nums">
            {props.endedAtKstHHmm} 종료
          </p>
        </>
      ) : null}
      {props.kind === "none" ? (
        <p className="text-muted-foreground mt-1 text-[12px] font-bold">
          {props.reason === "no_route"
            ? "노선 미배정"
            : "오늘 운행 없음"}
        </p>
      ) : null}
    </div>
  );
}
