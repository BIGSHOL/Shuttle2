"use client";

import { useEffect, useState, useTransition } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";

import { upsertSafetyCheckAction } from "../../../run/actions";

import { BtnBig } from "./btn-big";
import { CheckItem } from "./check-item";

// W24-D Phase 2 driver: refac Driver Run.html "01 · 출발 전 안전점검" 픽셀 단위
// reproduce. refac은 4개 점검 항목 — 우리 SafetyCheck schema는 seatbeltAllOk +
// helperPresent 2개만 있어 나머지 2개(비상등·후진경보음, 출입문 잠금장치)는
// client state로 임시 처리. 베타 backlog: SafetyCheck.emergencyLightOk +
// doorLockOk 컬럼 추가해서 영구 저장.
//
// refac CSS:
//   .check-screen{height:100%;display:flex;flex-direction:column}
//   .check-head{padding:8px 24px 18px;border-bottom:1px solid var(--line)}
//   .check-head .crumb{font-size:11px;font-weight:800;letter-spacing:0.04em;
//                      text-transform:uppercase;color:mute;margin-bottom:4px}
//   .check-head h1{font-size:24px;font-weight:900;letter-spacing:-0.02em;line-height:1.15}
//   .check-head .meta{margin-top:8px;font-size:11px;font-weight:700;color:mute;
//                     gap:6px;flex-wrap:wrap}
//   .progress{padding:14px 24px 0}
//   .progress-bar{height:6px;background:card;border-radius:999px}
//   .progress-fill{height:100%;background:bus;border-radius:999px}
//   .progress-meta{margin-top:6px;font-size:10px;font-weight:800;
//                  letter-spacing:0.04em;text-transform:uppercase;color:mute}
//   .progress-meta strong{color:bus;font-weight:900}
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
  // refac 4 항목 중 schema 미지원 3개는 client state. helperPresent는 자동 처리:
  // 운행 시작 시 helper 선택했으면 자동 true. (도교법 §53⑦ 동승보호자 의무는
  // /run 단계에서 helper 미배정 시 차단. 여기선 visual checklist에 별도 노출 X)
  const [emergencyLightOk, setEmergencyLightOk] = useState<boolean>(false);
  const [doorLockOk, setDoorLockOk] = useState<boolean>(false);
  const [capacityOk, setCapacityOk] = useState<boolean>(false);

  const seatbelt = safetyCheck?.seatbeltAllOk ?? false;
  // helperPresent는 helper 배정 시 자동 set. 사용자에게 별도 토글 노출 안 함.
  // 도교법 §53⑦은 helper 배정만으로 자동 충족.
  const helperPresentInDb = safetyCheck?.helperPresent ?? false;
  useEffect(() => {
    if (helperName && !helperPresentInDb) {
      startTransition(async () => {
        try {
          await upsertSafetyCheckAction(tripId, { helperPresent: true });
        } catch {
          /* swallow — re-render 시 다시 시도 */
        }
      });
    }
  }, [helperName, helperPresentInDb, tripId]);

  const items: Array<{
    id: string;
    title: string;
    desc: string;
    done: boolean;
    onToggle: () => void;
  }> = [
    {
      id: "seatbelt",
      title: "안전벨트 작동 확인",
      desc: "모든 좌석의 벨트가 정상 작동하는지 점검",
      done: seatbelt,
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
      id: "emergency",
      title: "비상등·후진경보음",
      desc: "비상등, 후진 시 경보음 작동 확인",
      done: emergencyLightOk,
      onToggle: () => setEmergencyLightOk((v) => !v),
    },
    {
      id: "door",
      title: "출입문 잠금장치",
      desc: "승하차문이 잘 닫히고 잠금이 정상인지 확인",
      done: doorLockOk,
      onToggle: () => setDoorLockOk((v) => !v),
    },
    {
      id: "capacity",
      title: "좌석·통로 인원 제한",
      desc: "정원 초과 여부, 통로 적재물 없는지 확인",
      done: capacityOk,
      onToggle: () => setCapacityOk((v) => !v),
    },
  ];

  const total = items.length;
  const done = items.filter((i) => i.done).length;
  const allDone = done === total;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  // active = 첫 미완료 항목
  const activeIdx = items.findIndex((i) => !i.done);

  return (
    <main className="bg-background flex min-h-[100dvh] flex-col">
      {/* refac .check-head */}
      <header className="border-border border-b px-[24px] pt-2 pb-[18px]">
        <p className="text-muted-foreground mb-1 text-[11px] font-extrabold uppercase tracking-[0.04em]">
          {routeName} · {DIRECTION_LABEL[direction]} · {VEHICLE_MODE_LABEL[vehicleMode]}
        </p>
        <h1 className="text-[24px] font-black leading-[1.15] tracking-[-0.02em]">
          출발 전 안전점검
        </h1>
        <div className="text-muted-foreground mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
          <span className="bg-bus text-bus-foreground inline-flex items-center rounded-[4px] px-[7px] py-[2px] text-[10px] font-black uppercase tracking-[0.04em]">
            필수 의무
          </span>
          <span>· 차량 {vehiclePlate}</span>
          {helperName ? <span>· 동승 {helperName}</span> : null}
        </div>
      </header>

      {/* refac .progress */}
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
          <span>도교법 §53 의무 — 기사 {driverName}</span>
        </div>
      </div>

      {/* refac .checks */}
      <div className="flex-1 overflow-y-auto px-[18px] pt-[14px] pb-[16px]">
        {items.map((item, i) => (
          <CheckItem
            key={item.id}
            state={
              item.done ? "done" : i === activeIdx ? "active" : "pending"
            }
            title={item.title}
            description={item.desc}
            who={item.done ? `완료 · ${driverName}` : undefined}
            onToggle={item.onToggle}
            pending={pending}
          />
        ))}
      </div>

      {/* refac .check-cta */}
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
