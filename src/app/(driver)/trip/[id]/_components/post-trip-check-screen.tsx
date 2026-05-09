"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { upsertSafetyCheckAction } from "../../../run/actions";

import { ArrivedBanner } from "./arrived-banner";
import { BtnBig } from "./btn-big";
import { CheckItem } from "./check-item";

// W24-D Phase 2 driver: refac Driver Run.html "03 · 도착 후 안전점검" 픽셀 단위
// reproduce. 모든 stop 통과 + KIDS + 운행 종료 전 phase. 안전점검 4개 항목
// 완료해야 운행 종료 가능 — 차량 내부 학생 잔류 확인 등.
//
// 우리 schema는 allAlightedOk 1개만 있어 나머지 3개는 client state.
// 베타 backlog: SafetyCheck.cabinLockOk + keyReturnedOk + recordReviewedOk 추가.
//
// refac CSS:
//   .arrived-screen{background:bg;height:100%;display:flex;flex-direction:column}
//   .arrived-banner: 위 ArrivedBanner 재사용
//   .final-checks{flex:1;overflow-y:auto;padding:0 18px}
//   .final-checks h3{font-size:13px;font-weight:900;letter-spacing:0.06em;
//                    text-transform:uppercase;color:mute;margin:0 0 8px 4px}
//   .danger-note{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;
//                background:danger-soft;border:1px solid danger-30%;
//                border-radius:12px;margin-bottom:10px;font-size:12px;
//                font-weight:700;line-height:1.5}
//   .danger-note .icn{flex-shrink:0;color:danger}
//   .danger-note strong{color:danger}

export function PostTripCheckScreen({
  tripId,
  finalStopName,
  endedHHmm,
  alightedCount,
  elapsedMinutes,
  distanceKm,
  safetyCheck,
  onEndTrip,
  endPending,
  backHref,
}: {
  tripId: string;
  finalStopName: string;
  endedHHmm: string; // 현재 시각 (운행 종료 예정 시각)
  alightedCount: number;
  elapsedMinutes: number;
  distanceKm: number;
  safetyCheck: {
    seatbeltAllOk: boolean;
    helperPresent: boolean;
    allAlightedOk: boolean;
  } | null;
  onEndTrip: () => void;
  endPending: boolean;
  backHref: string;
}) {
  const [pending, startTransition] = useTransition();
  // refac 4 항목 중 schema 미지원 3개는 client state (allAlightedOk만 schema-backed)
  const [cabinLockOk, setCabinLockOk] = useState<boolean>(false);
  const [keyReturnedOk, setKeyReturnedOk] = useState<boolean>(false);
  const [recordReviewedOk, setRecordReviewedOk] = useState<boolean>(false);

  const allAlighted = safetyCheck?.allAlightedOk ?? false;

  const items: Array<{
    id: string;
    title: string;
    desc: string;
    done: boolean;
    onToggle: () => void;
  }> = [
    {
      id: "alighted",
      title: "차량 내부 학생 잔류 확인",
      desc: "모든 좌석·통로·뒷좌석을 직접 눈으로 확인",
      done: allAlighted,
      onToggle: () => {
        startTransition(async () => {
          try {
            await upsertSafetyCheckAction(tripId, {
              allAlightedOk: !allAlighted,
            });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "저장 실패");
          }
        });
      },
    },
    {
      id: "cabinLock",
      title: "차량 내부 잠금",
      desc: "전 좌석 벨트 정리, 모든 출입문 잠금",
      done: cabinLockOk,
      onToggle: () => setCabinLockOk((v) => !v),
    },
    {
      id: "key",
      title: "키 회수",
      desc: "시동키 학원 사무실 보관함에 반납",
      done: keyReturnedOk,
      onToggle: () => setKeyReturnedOk((v) => !v),
    },
    {
      id: "record",
      title: "운영기록 확인",
      desc: "인원·시각·경로 자동 기록 검토",
      done: recordReviewedOk,
      onToggle: () => setRecordReviewedOk((v) => !v),
    },
  ];

  const total = items.length;
  const done = items.filter((i) => i.done).length;
  const allDone = done === total;
  const activeIdx = items.findIndex((i) => !i.done);

  return (
    <main className="bg-background flex min-h-[100dvh] flex-col">
      {/* 작은 백 헤더 — refac에는 status bar만 있지만 운행 화면 복귀 옵션 */}
      <header className="border-border flex items-center gap-2 border-b px-4 py-3">
        <Link
          href={backHref}
          className="bg-card border-border text-foreground grid h-[38px] w-[38px] place-items-center rounded-[12px] border"
          aria-label="운행 화면으로"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <p className="text-muted-foreground text-[11px] font-extrabold uppercase tracking-[0.04em]">
          모든 정류장 통과 — 점검 후 종료
        </p>
      </header>

      {/* refac .arrived-banner */}
      <ArrivedBanner
        alightedCount={alightedCount}
        elapsedMinutes={elapsedMinutes}
        distanceKm={distanceKm}
        finalStopName={finalStopName}
        endedHHmm={endedHHmm}
      />

      {/* refac .final-checks */}
      <div className="flex-1 overflow-y-auto px-[18px]">
        <h3 className="text-muted-foreground mb-2 ml-1 text-[13px] font-black uppercase tracking-[0.06em]">
          도착 후 점검 — {done} / {total}
        </h3>
        {/* refac .danger-note */}
        <div className="bg-destructive-soft border-destructive/30 mb-[10px] flex items-start gap-[10px] rounded-[12px] border px-[14px] py-[12px] text-[12px] font-bold leading-[1.5]">
          <AlertTriangle
            className="text-destructive h-4 w-4 shrink-0"
            strokeWidth={2.5}
          />
          <p>
            <strong className="text-destructive font-black">
              차량 내부 학생 잔류 확인
            </strong>
            은 도로교통법상 의무 항목입니다. 빠뜨리면 운행 종료 불가.
          </p>
        </div>
        {items.map((item, i) => (
          <CheckItem
            key={item.id}
            state={
              item.done ? "done" : i === activeIdx ? "active" : "pending"
            }
            title={item.title}
            description={item.desc}
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
          variant={allDone ? "danger" : "disabled"}
          icon={allDone ? null : <Lock />}
          disabled={!allDone || endPending}
          onClick={onEndTrip}
        >
          {endPending
            ? "종료 중..."
            : allDone
              ? "운행 종료"
              : "점검 완료 후 운행 종료"}
        </BtnBig>
      </div>
    </main>
  );
}
