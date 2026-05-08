import { Sunrise, Sunset } from "lucide-react";

// W24-D Phase 1 home: refac Parent App.html "오늘 일정" sched-item.
// 픽셀 단위 align — refac CSS:
//
//   .sched{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
//   .sched-item{padding:10px;background:var(--muted);border-radius:10px}
//   .sched-item .lbl{font-size:10px;font-weight:900;letter-spacing:0.04em;
//                    text-transform:uppercase;color:var(--muted-foreground);
//                    display:flex;align-items:center;gap:4px}
//   .sched-item .lbl svg{width:11px;height:11px}
//   .sched-item .stop{font-size:13px;font-weight:800;margin-top:4px}
//   .sched-item .time{font-size:14px;font-weight:900;font-variant-numeric:tabular-nums;
//                     color:var(--foreground)}

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
    <div className="bg-muted rounded-[10px] p-[10px]">
      {/* refac .sched-item .lbl: 10px font-900 caps tracking-0.04em, svg 11px */}
      <div className="text-muted-foreground flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.04em]">
        <Icon className="h-[11px] w-[11px]" strokeWidth={2.25} />
        {directionLabel}
      </div>
      {props.kind === "scheduled" ? (
        <>
          {/* .sched-item .stop: 13px font-800 mt-4px */}
          <p className="mt-1 truncate text-[13px] font-extrabold">
            {props.childStopName}
          </p>
          {/* .sched-item .time: 14px font-900 tabular-nums */}
          <p className="text-foreground text-[14px] font-black tabular-nums">
            {props.scheduledFirstAt ?? "—"} 도착
          </p>
        </>
      ) : null}
      {props.kind === "finished" ? (
        <>
          <p className="mt-1 truncate text-[13px] font-extrabold">
            {props.childStopName}
          </p>
          <p className="text-success text-[14px] font-black tabular-nums">
            {props.endedAtKstHHmm} 종료
          </p>
        </>
      ) : null}
      {props.kind === "none" ? (
        <p className="text-muted-foreground mt-1 text-[12px] font-bold">
          {props.reason === "no_route" ? "노선 미배정" : "오늘 운행 없음"}
        </p>
      ) : null}
    </div>
  );
}
