"use client";

import { useTransition } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";

import { upsertSafetyCheckAction } from "../../../run/actions";
import type { SafetyFieldsInput } from "@/server/driver/types";

import { BtnBig } from "./btn-big";
import { CheckItem } from "./check-item";

// W24-D Phase 2 driver: refac Driver Run.html "01 · 출발 전 안전점검" 풀 reproduce.
// 픽셀 단위 align — refac CSS:
//
//   .check-screen{background:var(--bg);height:100%;display:flex;flex-direction:column}
//   .check-head{padding:8px 24px 18px;border-bottom:1px solid var(--line)}
//   .check-head .crumb{font-size:11px;color:var(--mute);font-weight:800;
//                      letter-spacing:0.04em;text-transform:uppercase;margin-bottom:4px}
//   .check-head h1{font-size:24px;font-weight:900;letter-spacing:-0.02em;line-height:1.15}
//   .check-head .meta{margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;
//                     font-size:11px;color:var(--mute);font-weight:700}
//   .progress{padding:14px 24px 0}
//   .progress-bar{height:6px;background:var(--card);border-radius:999px;overflow:hidden}
//   .progress-fill{height:100%;background:var(--bus);border-radius:999px}
//   .progress-meta{margin-top:6px;display:flex;justify-content:space-between;
//                  font-size:10px;color:var(--mute);font-weight:800;
//                  letter-spacing:0.04em;text-transform:uppercase}
//   .progress-meta strong{color:var(--bus);font-weight:900}
//   .checks{flex:1;overflow-y:auto;padding:14px 18px 16px}
//   .check-cta{padding:14px 18px 24px}

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;
const VEHICLE_MODE_LABEL = { KIDS: "어린이용", GENERAL: "일반용" } as const;

export function PreTripCheckScreen({
  tripId,
  routeName,
  direction,
  vehicleMode,
  vehiclePlate,
  helperName,
  driverName,
  safetyCheck,
  onComplete,
}: {
  tripId: string;
  routeName: string;
  direction: "PICKUP" | "DROPOFF";
  vehicleMode: "KIDS" | "GENERAL";
  vehiclePlate: string;
  helperName: string | null;
  driverName: string;
  safetyCheck: {
    seatbeltAllOk: boolean;
    helperPresent: boolean;
    allAlightedOk: boolean;
  } | null;
  onComplete: () => void;
}) {
  const [pending, startTransition] = useTransition();

  // refac 01 frame: 4개 check-item (안전벨트·비상등·출입문·좌석통로)
  // 우리 schema는 seatbeltAllOk + helperPresent 2개만 — 나머지는 visual placeholder.
  // 베타 backlog: SafetyCheck schema 확장 (emergencyLightOk, doorLockOk, capacityOk 추가).
  const seatbelt = safetyCheck?.seatbeltAllOk ?? false;
  const helper = safetyCheck?.helperPresent ?? false;

  const items: Array<{
    id: keyof SafetyFieldsInput | "_helper";
    title: string;
    desc: string;
    state: "done" | "active" | "pending";
    onToggle?: () => void;
  }> = [
    {
      id: "seatbeltAllOk",
      title: "안전벨트 작동 확인",
      desc: "모든 좌석의 벨트가 정상 작동하는지 점검",
      state: seatbelt ? "done" : !seatbelt ? "active" : "pending",
      onToggle: () => {
        startTransition(async () => {
          try {
            await upsertSafetyCheckAction(tripId, {
              seatbeltAllOk: !seatbelt,
            });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "저장 실패");
          }
        });
      },
    },
    {
      id: "_helper",
      title: "동승보호자 동승 확인",
      desc: helperName
        ? `${helperName}님 탑승 여부 확인 (도교법 §53⑦ 의무)`
        : "동승자 미지정 — 운행 목록에서 지정 필요",
      state: helper ? "done" : "active",
      onToggle: () => {
        startTransition(async () => {
          try {
            await upsertSafetyCheckAction(tripId, { helperPresent: !helper });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "저장 실패");
          }
        });
      },
    },
  ];

  const total = items.length;
  const done = items.filter((i) => i.state === "done").length;
  const allDone = done === total;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <main className="bg-background flex min-h-[100dvh] flex-col">
      {/* refac .check-head: padding 8/24/18 + border-b */}
      <header className="border-border border-b px-[24px] pt-2 pb-[18px]">
        {/* .crumb: 11px font-800 caps tracking-0.04em mute mb-4px */}
        <p className="text-muted-foreground mb-1 text-[11px] font-extrabold uppercase tracking-[0.04em]">
          {routeName} · {DIRECTION_LABEL[direction]} · {VEHICLE_MODE_LABEL[vehicleMode]}
        </p>
        {/* .check-head h1: 24px font-900 tracking-(-0.02em) line-1.15 */}
        <h1 className="text-[24px] font-black leading-[1.15] tracking-[-0.02em]">
          출발 전 안전점검
        </h1>
        {/* .meta: 11px font-700 mute, gap-6px flex-wrap */}
        <div className="text-muted-foreground mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
          <span className="bg-bus text-bus-foreground inline-flex items-center rounded-[4px] px-[7px] py-[2px] text-[10px] font-black uppercase tracking-[0.04em]">
            필수 의무
          </span>
          <span>· 차량 {vehiclePlate}</span>
          <span>· 기사 {driverName}</span>
          {helperName ? <span>· 동승 {helperName}</span> : null}
        </div>
      </header>

      {/* refac .progress: padding 14/24/0 */}
      <div className="px-[24px] pt-[14px]">
        <div className="bg-muted h-[6px] overflow-hidden rounded-full">
          <div
            className="bg-bus h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-muted-foreground mt-1.5 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.04em]">
          <span>
            <strong className="text-bus font-black">{done}</strong> / {total} 완료
          </span>
          <span>{vehicleMode === "KIDS" ? "도교법 §53 의무" : "운행 시작 전"}</span>
        </div>
      </div>

      {/* refac .checks: flex-1 overflow-auto padding 14/18/16 */}
      <div className="flex-1 overflow-y-auto px-[18px] pt-[14px] pb-[16px]">
        {items.map((item, i) => (
          <CheckItem
            key={item.id}
            state={
              item.state === "done"
                ? "done"
                : i === items.findIndex((it) => it.state !== "done")
                  ? "active"
                  : "pending"
            }
            title={item.title}
            description={item.desc}
            who={
              item.state === "done"
                ? `완료 · ${driverName}`
                : undefined
            }
            onToggle={item.onToggle}
            pending={pending}
          />
        ))}
      </div>

      {/* refac .check-cta: padding 14/18/24 + gradient fade */}
      <div
        className="bg-background sticky bottom-0 px-[18px] pt-[14px]"
        style={{
          paddingBottom: "max(24px, env(safe-area-inset-bottom))",
        }}
      >
        <BtnBig
          variant={allDone ? "primary" : "disabled"}
          icon={allDone ? null : <Lock />}
          disabled={!allDone || pending}
          onClick={onComplete}
        >
          {allDone ? "운행 시작" : "점검 완료 후 운행 시작"}
        </BtnBig>
      </div>
    </main>
  );
}
