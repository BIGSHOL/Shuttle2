"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  Check,
  CircleAlert,
  Clock,
  MapPin,
  Square,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWakeLock } from "@/lib/wake-lock/use-wake-lock";

import {
  assignHelperAction,
  endTripAction,
  markBoardingIssueAction,
  toggleBoardingEventAction,
  unmarkBoardingIssueAction,
  upsertSafetyCheckAction,
} from "../../run/actions";
import type { SafetyFieldsInput } from "@/server/driver/types";
import {
  EndTripModal,
  type UnprocessedItem,
} from "./_components/end-trip-modal";
import { useGpsTracker } from "./gps-tracker";

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

type StopRow = {
  id: string;
  order: number;
  scheduledAt: string;
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
  students: {
    id: string;
    name: string;
    absence:
      | {
          status: "PENDING" | "NOTIFIED_DRIVER" | "ACKNOWLEDGED" | "REJECTED";
          reason: string | null;
        }
      | null;
    issue:
      | {
          type: "NO_SHOW" | "NO_DROPOFF";
          reason: string | null;
        }
      | null;
  }[];
};

type StaffRef = { id: string; name: string };

export function TripRunningView({
  tripId,
  route,
  vehicle,
  stops,
  isKidsMode,
  startedAtISO,
  safetyCheck,
  boardedStudentIds,
  alightedStudentIds,
  driver,
  helper,
  helperCandidates,
  isDriver,
  isHelper,
}: {
  tripId: string;
  route: { name: string; direction: "PICKUP" | "DROPOFF" };
  vehicle: { plate: string; mode: "KIDS" | "GENERAL" };
  stops: StopRow[];
  isKidsMode: boolean;
  startedAtISO: string | null;
  safetyCheck: {
    seatbeltAllOk: boolean;
    helperPresent: boolean;
    allAlightedOk: boolean;
  } | null;
  boardedStudentIds: string[];
  alightedStudentIds: string[];
  driver: StaffRef;
  helper: StaffRef | null;
  helperCandidates: StaffRef[];
  isDriver: boolean;
  isHelper: boolean;
}) {
  // Wake Lock — 화면 자동 꺼짐 방지
  const wakeLock = useWakeLock(true);

  // M1: 정류장 통과 후 60초가 지났는데도 미처리(미체크 + issue 없음 + 결석 ACK 아님)
  // 학생을 노란 강조로 알림. 기사가 학생 처리를 잊은 케이스 시각 보강.
  // S1(종료 모달 강제)과 함께 NO_SHOW 누락 위험을 다층으로 차단.
  const [stopExpired, setStopExpired] = useState<Set<string>>(new Set());
  const expireTimeoutsRef = useRef<Map<string, number>>(new Map());

  const handleStopPassed = useCallback((stopId: string) => {
    // 같은 정류장에 timeout이 이미 등록돼 있으면 무시 (idempotent)
    if (expireTimeoutsRef.current.has(stopId)) return;
    const id = window.setTimeout(() => {
      setStopExpired((prev) => {
        if (prev.has(stopId)) return prev;
        const next = new Set(prev);
        next.add(stopId);
        return next;
      });
      expireTimeoutsRef.current.delete(stopId);
    }, 60_000);
    expireTimeoutsRef.current.set(stopId, id);
  }, []);

  // unmount 시 timeout 모두 cleanup (메모리 누수 방지)
  useEffect(() => {
    const m = expireTimeoutsRef.current;
    return () => {
      for (const tid of m.values()) window.clearTimeout(tid);
      m.clear();
    };
  }, []);

  // GPS 추적
  const gps = useGpsTracker({
    tripId,
    active: true,
    stops: stops.map((s) => ({
      id: s.id,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      radiusM: s.radiusM,
      order: s.order,
    })),
    onStopPassed: handleStopPassed,
  });

  // 경과 시간
  const [elapsed, setElapsed] = useState("00:00");
  useEffect(() => {
    if (!startedAtISO) return;
    const start = new Date(startedAtISO).getTime();
    const tick = () => {
      const sec = Math.floor((Date.now() - start) / 1000);
      const m = Math.floor(sec / 60)
        .toString()
        .padStart(2, "0");
      const s = (sec % 60).toString().padStart(2, "0");
      setElapsed(`${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAtISO]);

  const boardedSet = new Set(boardedStudentIds);
  const alightedSet = new Set(alightedStudentIds);
  // PICKUP은 BOARD 토글, DROPOFF는 ALIGHT 토글
  const eventType: "BOARD" | "ALIGHT" =
    route.direction === "PICKUP" ? "BOARD" : "ALIGHT";
  const checkedSet = eventType === "BOARD" ? boardedSet : alightedSet;

  // 운행 종료
  const [endPending, startEndTransition] = useTransition();
  const [endError, setEndError] = useState<string | null>(null);
  const [endModalOpen, setEndModalOpen] = useState(false);

  // S1: 미처리 학생 계산. 결석 ACKNOWLEDGED 또는 이미 BOARD/ALIGHT 또는
  // NO_SHOW/NO_DROPOFF 보고된 학생은 처리됨으로 간주.
  function computeUnprocessed(): UnprocessedItem[] {
    const issueType = eventType === "BOARD" ? "NO_SHOW" : "NO_DROPOFF";
    const result: UnprocessedItem[] = [];
    for (const stop of stops) {
      for (const s of stop.students) {
        if (s.absence?.status === "ACKNOWLEDGED") continue;
        if (s.issue?.type === issueType) continue;
        if (checkedSet.has(s.id)) continue;
        result.push({
          studentId: s.id,
          studentName: s.name,
          stopName: stop.name,
        });
      }
    }
    return result;
  }

  function doEndTrip() {
    setEndError(null);
    startEndTransition(async () => {
      try {
        const result = await endTripAction(tripId);
        if (result && "error" in result) {
          setEndError(result.error);
        }
      } catch (err) {
        console.error("[trip-running-view] end-trip failed", err);
        setEndError("운행 종료에 실패했어요. 잠시 후 다시 시도해 주세요.");
      }
    });
  }

  function handleEnd() {
    // S1: 미처리 학생 강제 확인. 학생별로 [탑승]/[미탑승 보고] 처리해야 종료 가능.
    const unprocessed = computeUnprocessed();
    if (unprocessed.length > 0) {
      setEndModalOpen(true);
      return;
    }
    if (isKidsMode && !safetyCheck?.allAlightedOk) {
      if (
        !confirm(
          "전원 하차 확인이 체크되지 않았습니다. 그래도 운행을 종료할까요?",
        )
      )
        return;
    } else if (
      !confirm("운행을 종료할까요? 종료 후에는 위치 송신이 멈춥니다.")
    ) {
      return;
    }
    doEndTrip();
  }

  return (
    <main className="space-y-4 px-4 pt-4 pb-6">
      {/* Wake Lock 미지원 — sticky 경고 */}
      {!wakeLock.supported ? (
        <div className="border-warning bg-warning-soft text-warning-foreground rounded-lg border p-3 text-xs font-medium">
          <p className="text-warning inline-flex items-center gap-1.5 text-sm font-extrabold">
            <AlertTriangle className="h-4 w-4" />
            화면 자동 꺼짐 방지가 지원되지 않습니다
          </p>
          <p className="mt-1">
            아이폰 사파리 브라우저는 화면 잠금 방지가 동작하지 않습니다.
            안드로이드 폰을 거치대에 두고 화면을 켜둔 채 운행하세요.
          </p>
        </div>
      ) : null}

      {/* KIDS 모드 동승자 미선택 — 도로교통법 §53⑦ */}
      {isKidsMode &&
      !helper &&
      stops.reduce((acc, s) => acc + s.students.length, 0) >= 1 ? (
        <div className="border-destructive bg-destructive/10 rounded-lg border p-3">
          <p className="text-destructive inline-flex items-center gap-1.5 text-sm font-extrabold">
            <CircleAlert className="h-4 w-4" />
            동승보호자가 지정되지 않았어요
          </p>
          <p className="text-foreground/80 mt-1 text-xs font-medium">
            어린이통학버스 운행에는 법령에 따라 동승보호자가 함께 타야
            합니다. 아래에서 동승자를 지정한 후 운행을 진행해 주세요.
          </p>
        </div>
      ) : null}

      {/* 운행 헤드 — dark gradient + 노란 accent stripe */}
      <div
        className="relative overflow-hidden rounded-lg p-4 text-white shadow-md"
        style={{
          background: "linear-gradient(155deg, #1a1c22, #0f1014)",
        }}
      >
        <div className="bg-bus absolute inset-x-0 top-0 h-[3px]" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase ${
                  route.direction === "PICKUP"
                    ? "bg-success-soft text-success"
                    : "bg-info-soft text-info"
                }`}
              >
                {DIRECTION_LABEL[route.direction]}
              </span>
              {isKidsMode ? (
                <span className="bg-bus text-bus-foreground inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                  <span className="bg-bus-foreground inline-block h-1.5 w-1.5 animate-pulse rounded-full" />
                  어린이용
                </span>
              ) : (
                <span className="bg-white/15 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                  일반용
                </span>
              )}
            </div>
            <p className="mt-1.5 truncate text-lg font-extrabold tracking-tight">
              {route.name}
            </p>
            <p className="mt-0.5 text-xs font-medium opacity-70">
              {vehicle.plate}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-extrabold tracking-wide uppercase opacity-60">
              경과
            </p>
            <p className="font-mono text-3xl font-extrabold tracking-tight">
              {elapsed}
            </p>
          </div>
        </div>
        {/* 상태 칩 */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
          <span
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-bold ${
              wakeLock.active
                ? "bg-success/20 text-success"
                : "bg-white/10 text-white/70"
            }`}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                wakeLock.active ? "bg-success animate-pulse" : "bg-white/40"
              }`}
            />
            화면잠금 {wakeLock.active ? "켜짐" : "꺼짐"}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-bold ${
              gps.fix
                ? "bg-success/20 text-success"
                : gps.error
                  ? "bg-destructive/20 text-destructive"
                  : "bg-white/10 text-white/70"
            }`}
          >
            <MapPin className="h-3 w-3" />
            위치{" "}
            {gps.fix
              ? `±${Math.round(gps.fix.accuracy)}m`
              : gps.error
                ? "오류"
                : "수신중"}
          </span>
          {isDriver ? (
            <span className="bg-white/10 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-bold opacity-90">
              기사 · {driver.name}
            </span>
          ) : null}
          {helper ? (
            <span className="bg-white/10 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-bold opacity-90">
              동승 · {helper.name}
            </span>
          ) : null}
        </div>
        {wakeLock.error ? (
          <p className="text-destructive mt-2 text-xs">{wakeLock.error}</p>
        ) : null}
        {gps.error ? (
          <div className="border-destructive/40 bg-destructive/5 mt-2 rounded-md border p-2.5">
            <p className="text-destructive text-xs font-bold">
              GPS 신호 없음
            </p>
            <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
              {gps.error}
            </p>
            <p className="text-muted-foreground mt-1 text-[11px] font-medium">
              지하 주차장·터널일 수 있어요. 야외로 나오거나, 위치 권한이 막혔다면
              브라우저 자물쇠 → 위치 → 허용으로 변경.
            </p>
            <button
              type="button"
              onClick={gps.retry}
              className="bg-destructive text-destructive-foreground mt-2 inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-bold hover:opacity-90"
            >
              GPS 다시 시도
            </button>
          </div>
        ) : null}
      </div>

      {/* Helper picker — driver만 */}
      {isDriver ? (
        <HelperPicker
          tripId={tripId}
          current={helper}
          options={helperCandidates}
        />
      ) : null}

      {/* SafetyCheck — KIDS 모드만 */}
      {isKidsMode ? (
        <SafetyCheckCard
          tripId={tripId}
          phase="pre"
          safetyCheck={safetyCheck}
        />
      ) : null}

      {/* 정류장 진행도 + 학생 탑승·하차 토글 */}
      <section className="bg-card rounded-lg border p-4 shadow-sm">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold tracking-tight">
              정류장·{eventType === "BOARD" ? "탑승" : "하차"} 체크
            </h3>
            <p className="text-muted-foreground mt-0.5 text-xs font-medium">
              {stops.length}개 중 통과 {gps.passed.size}개
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-extrabold tracking-wide uppercase text-muted-foreground">
              진행
            </p>
            <p className="font-mono text-lg font-extrabold tracking-tight">
              {gps.passed.size}/{stops.length}
            </p>
          </div>
        </div>
        <ol className="space-y-3">
          {stops.map((s) => {
            const isPassed = gps.passed.has(s.id);
            return (
              <li key={s.id}>
                <div className="flex items-center gap-3 text-sm">
                  <span
                    className={
                      isPassed
                        ? "bg-success text-success-foreground flex h-9 w-9 items-center justify-center rounded-full font-bold shadow-sm"
                        : "bg-muted text-muted-foreground flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold"
                    }
                  >
                    {isPassed ? <Check className="h-4 w-4" /> : s.order}
                  </span>
                  <span
                    className={
                      isPassed
                        ? "text-muted-foreground flex-1 truncate text-sm font-bold line-through"
                        : "flex-1 truncate text-sm font-bold"
                    }
                  >
                    {s.name}
                  </span>
                  <span className="text-muted-foreground inline-flex items-center gap-1 text-xs font-medium font-mono">
                    <Clock className="h-3 w-3" />
                    {s.scheduledAt}
                  </span>
                </div>
                {s.students.length > 0 ? (
                  <ul className="mt-2 space-y-1.5 pl-12">
                    {s.students.map((st) => (
                      <BoardingRow
                        key={st.id}
                        tripId={tripId}
                        studentId={st.id}
                        studentName={st.name}
                        type={eventType}
                        checked={checkedSet.has(st.id)}
                        gpsLat={gps.fix?.latitude ?? null}
                        gpsLng={gps.fix?.longitude ?? null}
                        absence={st.absence}
                        issue={st.issue}
                        stopPassedExpired={stopExpired.has(s.id)}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground mt-1 pl-12 text-xs font-medium">
                    배정된 학생 없음
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {/* 전원 하차 확인 — KIDS 모드 종료 전 */}
      {isKidsMode ? (
        <SafetyCheckCard
          tripId={tripId}
          phase="post"
          safetyCheck={safetyCheck}
        />
      ) : null}

      {/* 운행 종료 — driver만 */}
      {isDriver ? (
        <div className="border-destructive/30 bg-destructive/5 space-y-2 rounded-lg border p-4">
          <Button
            type="button"
            variant="destructive"
            size="lg"
            className="w-full text-base font-extrabold"
            disabled={endPending}
            onClick={handleEnd}
          >
            <Square className="mr-1 h-4 w-4 fill-current" />
            {endPending ? "종료 중..." : "운행 종료"}
          </Button>
          {endError ? (
            <p className="text-destructive text-xs font-medium" role="alert">
              {endError}
            </p>
          ) : null}
          <p className="text-muted-foreground text-[11px] font-medium">
            종료를 누르면 GPS 송신이 멈추고 운행 기록이 마감됩니다.
          </p>
        </div>
      ) : null}

      {!isDriver && isHelper ? (
        <p className="text-muted-foreground pt-2 text-center text-xs font-medium">
          동승보호자는 종료할 수 없습니다. 기사님만 운행 종료 가능.
        </p>
      ) : null}

      {endModalOpen ? (
        <EndTripModal
          tripId={tripId}
          eventType={eventType}
          items={computeUnprocessed()}
          onClose={() => setEndModalOpen(false)}
          onAllResolved={() => {
            setEndModalOpen(false);
            // 마지막 학생까지 처리됐으면 안전점검 confirm은 건너뛰고 즉시 종료.
            doEndTrip();
          }}
        />
      ) : null}
    </main>
  );
}

// ────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────

function SafetyCheckCard({
  tripId,
  phase,
  safetyCheck,
}: {
  tripId: string;
  phase: "pre" | "post";
  safetyCheck: {
    seatbeltAllOk: boolean;
    helperPresent: boolean;
    allAlightedOk: boolean;
  } | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(field: keyof SafetyFieldsInput, current: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        await upsertSafetyCheckAction(tripId, { [field]: !current });
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장 실패");
      }
    });
  }

  const seatbelt = safetyCheck?.seatbeltAllOk ?? false;
  const helperPresent = safetyCheck?.helperPresent ?? false;
  const alighted = safetyCheck?.allAlightedOk ?? false;

  return (
    <section className="border-warning/30 bg-warning-soft/40 rounded-lg border p-4">
      <div className="flex items-start gap-2">
        <span className="bg-warning text-warning-foreground mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
          <AlertTriangle className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold tracking-tight">
            {phase === "pre"
              ? "출발 전 안전점검 (어린이용)"
              : "종료 전 전원 하차 확인 (어린이용)"}
          </h3>
          <p className="text-muted-foreground mt-0.5 text-xs font-medium">
            {phase === "pre"
              ? "법정 안전운행기록 데이터. 출발 전 반드시 확인."
              : "운행 종료 전 전원 하차 여부를 확인하세요."}
          </p>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        {phase === "pre" ? (
          <>
            <CheckboxRow
              label="좌석 안전띠 전원 확인"
              checked={seatbelt}
              disabled={pending}
              onClick={() => toggle("seatbeltAllOk", seatbelt)}
            />
            <CheckboxRow
              label="동승보호자 동승 확인"
              checked={helperPresent}
              disabled={pending}
              onClick={() => toggle("helperPresent", helperPresent)}
            />
          </>
        ) : (
          <CheckboxRow
            label="전원 하차 확인"
            checked={alighted}
            disabled={pending}
            onClick={() => toggle("allAlightedOk", alighted)}
          />
        )}
        {error ? (
          <p className="text-destructive text-xs font-medium" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function CheckboxRow({
  label,
  checked,
  disabled,
  onClick,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        checked
          ? "border-success bg-success-soft text-success flex w-full items-center gap-3 rounded-md border-2 px-3.5 py-3 text-left text-sm font-extrabold disabled:opacity-60"
          : "border-input bg-background hover:bg-muted active:bg-muted flex w-full items-center gap-3 rounded-md border px-3.5 py-3 text-left text-sm font-bold disabled:opacity-60"
      }
    >
      <span
        className={
          checked
            ? "bg-success text-success-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
            : "border-input flex h-6 w-6 shrink-0 items-center justify-center rounded-md border"
        }
      >
        {checked ? <Check className="h-4 w-4" /> : null}
      </span>
      <span className="flex-1">{label}</span>
    </button>
  );
}

function BoardingRow({
  tripId,
  studentId,
  studentName,
  type,
  checked,
  gpsLat,
  gpsLng,
  absence,
  issue,
  stopPassedExpired,
}: {
  tripId: string;
  studentId: string;
  studentName: string;
  type: "BOARD" | "ALIGHT";
  checked: boolean;
  gpsLat: number | null;
  gpsLng: number | null;
  absence:
    | {
        status: "PENDING" | "NOTIFIED_DRIVER" | "ACKNOWLEDGED" | "REJECTED";
        reason: string | null;
      }
    | null;
  issue:
    | {
        type: "NO_SHOW" | "NO_DROPOFF";
        reason: string | null;
      }
    | null;
  // M1: 정류장 통과 후 60초가 지났는데도 처리되지 않은 학생 강조 플래그.
  stopPassedExpired: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  function toggle() {
    setError(null);
    startTransition(async () => {
      try {
        await toggleBoardingEventAction({
          tripId,
          studentId,
          type,
          lat: gpsLat ?? undefined,
          lng: gpsLng ?? undefined,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장 실패");
      }
    });
  }

  function reportIssue() {
    if (reportReason.trim().length === 0) {
      setError("사유를 입력하세요");
      return;
    }
    setError(null);
    const issueType = type === "BOARD" ? "NO_SHOW" : "NO_DROPOFF";
    startTransition(async () => {
      try {
        await markBoardingIssueAction({
          tripId,
          studentId,
          type: issueType,
          reason: reportReason.trim(),
          lat: gpsLat ?? undefined,
          lng: gpsLng ?? undefined,
        });
        setReportOpen(false);
        setReportReason("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장 실패");
      }
    });
  }

  function clearIssue() {
    if (!issue) return;
    setError(null);
    startTransition(async () => {
      try {
        await unmarkBoardingIssueAction(tripId, studentId, issue.type);
      } catch (err) {
        setError(err instanceof Error ? err.message : "해제 실패");
      }
    });
  }

  const action = type === "BOARD" ? "탑승" : "하차";
  const issueLabel = type === "BOARD" ? "미탑승" : "미하차";

  // 미탑승·미하차 마크된 학생: destructive 배경 + 사유 + 해제 버튼
  if (issue) {
    return (
      <li>
        <div className="border-destructive bg-destructive/10 flex items-center gap-2 rounded-md border-2 px-3 py-2.5 text-sm">
          <AlertTriangle className="text-destructive h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-destructive truncate font-extrabold">
              {studentName}{" "}
              <span className="text-[11px]">
                — {issue.type === "NO_SHOW" ? "미탑승" : "미하차"}
              </span>
            </p>
            {issue.reason ? (
              <p className="text-muted-foreground mt-0.5 truncate text-[11px] font-medium">
                사유: {issue.reason}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={clearIssue}
            disabled={pending}
          >
            해제
          </Button>
        </div>
        {error ? (
          <p className="text-destructive mt-0.5 px-3 text-[10px] font-medium">
            {error}
          </p>
        ) : null}
      </li>
    );
  }

  // 결석 신청된 학생: 회색 배경 + "결석" 뱃지 + 사유 (있으면). 탑승 토글
  // 자체는 막지 않음 — driver가 학부모 사정 변경됐을 수 있음.
  if (absence) {
    const ackLabel =
      absence.status === "ACKNOWLEDGED"
        ? "결석 (확인)"
        : absence.status === "NOTIFIED_DRIVER"
          ? "결석 (전달됨)"
          : "결석 (대기)";
    return (
      <li>
        <button
          type="button"
          disabled={pending}
          onClick={toggle}
          className={
            checked
              ? "border-success bg-success-soft text-success flex w-full items-center gap-2 rounded-md border-2 px-3 py-2.5 text-left text-sm font-extrabold disabled:opacity-60"
              : "border-warning/40 bg-warning-soft/50 text-muted-foreground hover:bg-warning-soft/80 flex w-full items-center gap-2 rounded-md border px-3 py-2.5 text-left text-sm font-medium line-through disabled:opacity-60"
          }
        >
          <span
            className={
              checked
                ? "bg-success text-success-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
                : "border-warning/60 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border"
            }
          >
            {checked ? <Check className="h-3.5 w-3.5" /> : null}
          </span>
          <span className="min-w-0 flex-1 truncate">{studentName}</span>
          <span className="bg-warning text-warning-foreground rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide whitespace-nowrap">
            {ackLabel}
          </span>
        </button>
        {absence.reason ? (
          <p className="text-muted-foreground mt-0.5 px-3 text-[10px] font-medium">
            사유: {absence.reason}
          </p>
        ) : null}
        {error ? (
          <p className="text-destructive mt-0.5 px-3 text-[10px] font-medium">
            {error}
          </p>
        ) : null}
      </li>
    );
  }

  // M1: 정류장 통과 후 60초 미처리이면 노란 깜빡임 + "처리 누락" 배지 강조.
  const expiredHighlight = stopPassedExpired && !checked;

  return (
    <li>
      <div
        className={
          expiredHighlight
            ? "ring-warning relative flex animate-pulse items-center gap-1.5 rounded-md ring-2 ring-offset-1"
            : "flex items-center gap-1.5"
        }
      >
        <button
          type="button"
          disabled={pending}
          onClick={toggle}
          className={
            checked
              ? "border-success bg-success-soft text-success flex flex-1 items-center gap-2 rounded-md border-2 px-3 py-2.5 text-left text-sm font-extrabold disabled:opacity-60"
              : expiredHighlight
                ? "border-warning bg-warning-soft hover:bg-warning-soft/80 active:bg-warning-soft/80 text-foreground flex flex-1 items-center gap-2 rounded-md border-2 px-3 py-2.5 text-left text-sm font-bold disabled:opacity-60"
                : "border-input bg-background hover:bg-muted active:bg-muted flex flex-1 items-center gap-2 rounded-md border px-3 py-2.5 text-left text-sm font-bold disabled:opacity-60"
          }
        >
          <span
            className={
              checked
                ? "bg-success text-success-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
                : expiredHighlight
                  ? "border-warning bg-background flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2"
                  : "border-input flex h-5 w-5 shrink-0 items-center justify-center rounded-md border"
            }
          >
            {checked ? <Check className="h-3.5 w-3.5" /> : null}
          </span>
          <span className="min-w-0 flex-1 truncate">{studentName}</span>
          {expiredHighlight ? (
            <span className="bg-warning text-warning-foreground rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide whitespace-nowrap">
              처리 누락
            </span>
          ) : null}
          <span className="text-muted-foreground text-xs font-bold whitespace-nowrap">
            {action}
          </span>
        </button>
        {!checked ? (
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            disabled={pending}
            className="border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-destructive flex h-10 w-10 shrink-0 items-center justify-center rounded-md border disabled:opacity-60"
            title={`${issueLabel} 보고`}
            aria-label={`${issueLabel} 보고`}
          >
            <AlertTriangle className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="text-destructive mt-0.5 px-3 text-[10px] font-medium">
          {error}
        </p>
      ) : null}

      {/* 사유 다이얼로그 (간단 모달) */}
      {reportOpen ? (
        <div
          className="bg-foreground/40 fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          onClick={() => !pending && setReportOpen(false)}
        >
          <div
            className="bg-card w-full max-w-md rounded-t-2xl border p-5 shadow-xl sm:rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-2">
              <span className="bg-destructive/10 text-destructive flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-extrabold tracking-tight">
                  {studentName} {issueLabel} 보고
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs font-medium">
                  {type === "BOARD"
                    ? "정류장에서 학생이 보이지 않으면 사유를 적고 보고하세요. 학부모·학원장에 즉시 푸시 알림이 갑니다."
                    : "정류장에서 학생이 내리지 못한 경우 사유와 후속 조치를 적으세요. 매우 위험 — 학부모·학원장에 즉시 경고됩니다."}
                </p>
              </div>
            </div>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder={
                type === "BOARD"
                  ? "예: 부모님과 통화했으나 안 나옴 / 결석 사전 미통보 / 시간 늦음 후 불가능"
                  : "예: 잠들어 있어 종점까지 동승 / 보호자 미도착 → 학원으로 복귀"
              }
              className="border-input bg-background mt-3 w-full rounded-md border p-3 text-sm font-medium"
              disabled={pending}
              autoFocus
            />
            {error ? (
              <p className="text-destructive mt-1.5 text-xs font-medium">
                {error}
              </p>
            ) : null}
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setReportOpen(false);
                  setReportReason("");
                  setError(null);
                }}
                disabled={pending}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                취소
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="flex-1 font-extrabold"
                onClick={reportIssue}
                disabled={pending}
              >
                <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                {pending ? "보고 중..." : `${issueLabel} 보고`}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function HelperPicker({
  tripId,
  current,
  options,
}: {
  tripId: string;
  current: StaffRef | null;
  options: StaffRef[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState(current?.id ?? "");

  function commit(newValue: string) {
    setValue(newValue);
    setError(null);
    startTransition(async () => {
      try {
        await assignHelperAction(tripId, newValue || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장 실패");
      }
    });
  }

  if (options.length === 0) {
    return (
      <section className="bg-card rounded-lg border p-4 shadow-sm">
        <h3 className="text-sm font-extrabold tracking-tight">동승보호자</h3>
        <p className="text-muted-foreground mt-1 text-xs font-medium">
          등록된 동승자가 없습니다. 학원장·원장이 직원 페이지에서 초대 후
          가입하면 여기 표시됩니다.
        </p>
      </section>
    );
  }

  // radix Select는 빈 문자열 값을 허용하지 않으므로 "__none__" sentinel로 대체.
  const NONE = "__none__";
  return (
    <section className="bg-card rounded-lg border p-4 shadow-sm">
      <h3 className="text-sm font-extrabold tracking-tight">동승보호자 지정</h3>
      <div className="mt-2">
        <Select
          value={value === "" ? NONE : value}
          disabled={pending}
          onValueChange={(v) => commit(v === NONE ? "" : v)}
        >
          <SelectTrigger className="h-10 rounded-md">
            <SelectValue placeholder="동승자 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— 동승자 없음 —</SelectItem>
            {options.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error ? (
        <p className="text-destructive mt-1.5 text-xs font-medium" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
