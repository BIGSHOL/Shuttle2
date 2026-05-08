import { Calendar } from "lucide-react";

import { ChildAvatar } from "@/components/shuttlee/child-avatar";
import { ModeBadge } from "@/components/shuttlee/mode-badge";
import { TripStatusBadge } from "@/components/shuttlee/trip-status-badge";

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

export type IdleCardProps =
  | {
      kind: "scheduled";
      childName: string;
      orgName: string;
      orgType: "ACADEMY" | "DAYCARE" | "KINDERGARTEN";
      mode: "KIDS" | "GENERAL";
      routeName: string;
      direction: "PICKUP" | "DROPOFF";
      childStopName: string;
      scheduledFirstAt: string | null;
    }
  | {
      kind: "finished";
      childName: string;
      orgName: string;
      orgType: "ACADEMY" | "DAYCARE" | "KINDERGARTEN";
      mode: "KIDS" | "GENERAL";
      routeName: string;
      direction: "PICKUP" | "DROPOFF";
      endedAtKstHHmm: string;
    }
  | {
      kind: "none";
      childName: string;
      orgName: string;
      orgType: "ACADEMY" | "DAYCARE" | "KINDERGARTEN";
      mode: "KIDS" | "GENERAL";
      reason: "no_route" | "off_day";
    };

const ORG_TYPE_LABEL = {
  ACADEMY: "학원",
  DAYCARE: "어린이집",
  KINDERGARTEN: "유치원",
} as const;

export function IdleTripCard(props: IdleCardProps) {
  return (
    <article className="bg-card rounded-xl border p-4 shadow-sm">
      <div className="mb-2.5 flex items-center gap-2.5">
        <ChildAvatar name={props.childName} tone="idle" size="default" />
        <div className="flex-1">
          <p className="text-sm font-bold tracking-tight">{props.childName}</p>
          <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
            {props.orgName} · {ORG_TYPE_LABEL[props.orgType]}
          </p>
        </div>
        <ModeBadge mode={props.mode} />
      </div>

      {props.kind === "scheduled" ? (
        <ScheduledRow
          direction={props.direction}
          routeName={props.routeName}
          childStopName={props.childStopName}
          scheduledFirstAt={props.scheduledFirstAt}
        />
      ) : null}

      {props.kind === "finished" ? (
        <FinishedRow
          direction={props.direction}
          routeName={props.routeName}
          endedAt={props.endedAtKstHHmm}
        />
      ) : null}

      {props.kind === "none" ? <NoneRow reason={props.reason} /> : null}
    </article>
  );
}

function ScheduledRow({
  direction,
  routeName,
  childStopName,
  scheduledFirstAt,
}: {
  direction: "PICKUP" | "DROPOFF";
  routeName: string;
  childStopName: string;
  scheduledFirstAt: string | null;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-foreground text-xs font-medium">
          {DIRECTION_LABEL[direction]} · {routeName}
        </p>
        <TripStatusBadge kind="scheduled" />
      </div>
      <div className="bg-muted/50 border-border/50 mt-3 flex items-center gap-2.5 rounded-lg border px-3 py-2.5">
        <Calendar className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
        <span className="text-foreground/80 flex-1 truncate text-xs font-semibold">
          {childStopName}
        </span>
        {scheduledFirstAt ? (
          <span className="text-foreground text-sm font-extrabold tracking-tight tabular-nums">
            {scheduledFirstAt}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function FinishedRow({
  direction,
  routeName,
  endedAt,
}: {
  direction: "PICKUP" | "DROPOFF";
  routeName: string;
  endedAt: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-foreground text-xs font-medium">
          {DIRECTION_LABEL[direction]} · {routeName}
        </p>
        <TripStatusBadge kind="ended" detail={endedAt} />
      </div>
    </div>
  );
}

function NoneRow({ reason }: { reason: "no_route" | "off_day" }) {
  const text =
    reason === "no_route"
      ? "노선이 아직 배정되지 않았어요"
      : "오늘 예정된 운행이 없어요";
  return (
    <p className="text-muted-foreground bg-muted/40 mt-1 rounded-lg px-3 py-2.5 text-center text-xs font-semibold">
      {text}
    </p>
  );
}
