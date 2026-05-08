"use client";

import { Check, Phone } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { toggleBoardingEventAction } from "../../../run/actions";

// W24-D Phase 2 driver: refac Driver Run.html "02 · 운행 중" .student row.
// 픽셀 단위 align — refac CSS 그대로:
//
//   .student{background:var(--card);border:1px solid var(--line);
//            border-radius:14px;margin-bottom:7px;padding:12px 14px;
//            display:flex;align-items:center;gap:12px}
//   .student.boarded{background:var(--card2);border-color:transparent;opacity:0.7}
//   .student.absent{background:transparent;border-color:var(--line);opacity:0.4}
//   .student.absent .stu-name{text-decoration:line-through}
//   .student.no-show{background:var(--danger-soft);border-color:rgba(255,97,85,0.4)}
//
//   .stu-avatar{width:36px;height:36px;border-radius:999px;background:var(--card2);
//               display:grid;place-items:center;font-size:13px;font-weight:900;
//               border:1.5px solid var(--line2)}
//   .student.boarded .stu-avatar{background:var(--ok);border-color:var(--ok);color:#fff}
//   .stu-name{font-size:15px;font-weight:800;letter-spacing:-0.01em}
//   .stu-meta{font-size:11px;color:var(--mute);font-weight:700;margin-top:1px}
//   .student.no-show .stu-meta{color:var(--danger)}
//
//   .stu-action{font-size:11px;font-weight:900;letter-spacing:0.04em;
//               text-transform:uppercase;padding:5px 10px;border-radius:6px;
//               background:var(--card2);color:var(--mute);border:0}
//   .student.boarded .stu-action{background:transparent;color:var(--ok)}
//   .student.no-show .stu-action{background:var(--danger);color:#fff}
//   .student .stu-action svg{width:11px;height:11px}

export type StudentRowVariant = "pending" | "boarded" | "absent" | "no-show";

export function StudentRow({
  tripId,
  studentId,
  studentName,
  meta,
  variant,
  eventType,
  gpsLat,
  gpsLng,
}: {
  tripId: string;
  studentId: string;
  studentName: string;
  meta: string;
  variant: StudentRowVariant;
  eventType: "BOARD" | "ALIGHT";
  gpsLat: number | null;
  gpsLng: number | null;
}) {
  const [pending, startTransition] = useTransition();

  const isBoarded = variant === "boarded";
  const isAbsent = variant === "absent";
  const isNoShow = variant === "no-show";

  // refac container variant 별 — bg + border + opacity
  const containerCls = isBoarded
    ? "bg-muted border-transparent opacity-70"
    : isAbsent
      ? "bg-transparent border-border opacity-40"
      : isNoShow
        ? "bg-destructive-soft border-destructive/40"
        : "bg-card border-border";

  const metaCls = isNoShow ? "text-destructive" : "text-muted-foreground";
  const nameCls = isAbsent ? "line-through" : "";

  const handleToggle = () => {
    if (pending) return;
    startTransition(async () => {
      try {
        await toggleBoardingEventAction({
          tripId,
          studentId,
          type: eventType,
          lat: gpsLat ?? undefined,
          lng: gpsLng ?? undefined,
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "처리 실패");
      }
    });
  };

  // refac stu-avatar — variant별 색 변환
  const avatar = isBoarded ? (
    <span className="bg-success border-success grid h-9 w-9 shrink-0 place-items-center rounded-full border-[1.5px] text-white">
      <Check className="h-4 w-4" strokeWidth={3} />
    </span>
  ) : isNoShow ? (
    <span className="bg-destructive border-destructive grid h-9 w-9 shrink-0 place-items-center rounded-full border-[1.5px] text-[13px] font-black text-white">
      {studentName.slice(0, 1)}
    </span>
  ) : (
    <span className="bg-muted border-border text-foreground grid h-9 w-9 shrink-0 place-items-center rounded-full border-[1.5px] text-[13px] font-black">
      {studentName.slice(0, 1)}
    </span>
  );

  // refac stu-action — pending/boarded/absent/no-show variants
  let action: React.ReactNode;
  if (isBoarded) {
    // refac .student.boarded .stu-action { background: transparent; color: ok }
    action = (
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        className="text-success rounded-[6px] bg-transparent px-[10px] py-[5px] text-[11px] font-black uppercase tracking-[0.04em] disabled:opacity-50"
      >
        {pending ? "..." : "탑승됨"}
      </button>
    );
  } else if (isNoShow) {
    // refac .student.no-show .stu-action { background: danger; color: white }
    action = (
      <button
        type="button"
        className="bg-destructive inline-flex items-center gap-1 rounded-[6px] px-[10px] py-[5px] text-[11px] font-black uppercase tracking-[0.04em] text-white"
      >
        <Phone className="h-[11px] w-[11px]" strokeWidth={2.5} />
        연락
      </button>
    );
  } else if (isAbsent) {
    // 결석 — refac에선 "결석" 텍스트만 (transparent action)
    action = (
      <span className="text-muted-foreground rounded-[6px] bg-transparent px-[10px] py-[5px] text-[11px] font-black uppercase tracking-[0.04em]">
        결석
      </span>
    );
  } else {
    // pending — refac 기본 .stu-action: bg-card2(muted) + mute color + check icon
    action = (
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-[6px] px-[10px] py-[5px] text-[11px] font-black uppercase tracking-[0.04em] disabled:opacity-50"
        aria-label={`${studentName} ${eventType === "BOARD" ? "탑승" : "하차"} 토글`}
      >
        {pending ? (
          "..."
        ) : (
          <>
            <Check className="h-[11px] w-[11px]" strokeWidth={2.5} />
            {eventType === "BOARD" ? "탑승" : "하차"}
          </>
        )}
      </button>
    );
  }

  return (
    <div
      className={`mb-[7px] flex items-center gap-[12px] rounded-[14px] border px-[14px] py-[12px] ${containerCls}`}
    >
      {avatar}
      <div className="min-w-0 flex-1">
        <p className={`text-[15px] font-extrabold tracking-[-0.01em] ${nameCls}`}>
          {studentName}
        </p>
        <p className={`mt-[1px] text-[11px] font-bold ${metaCls}`}>{meta}</p>
      </div>
      {action}
    </div>
  );
}
