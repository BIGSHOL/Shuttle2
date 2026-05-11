"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  AlertTriangle,
  Check,
  CircleAlert,
  MapPin,
  Square,
} from "lucide-react";
import { toast } from "sonner";

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
  markStopPassedAction,
  upsertSafetyCheckAction,
} from "../../run/actions";
import type { SafetyFieldsInput } from "@/server/driver/types";
import {
  EndTripModal,
  type UnprocessedItem,
} from "./_components/end-trip-modal";
import { BtnBig } from "./_components/btn-big";
import { NextStopCard } from "./_components/next-stop-card";
import { PostTripCheckScreen } from "./_components/post-trip-check-screen";
import { PreTripCheckScreen } from "./_components/pre-trip-check-screen";
import { RunTop } from "./_components/run-top";
import { StudentRow } from "./_components/student-row";
import { useGpsTracker } from "./gps-tracker";

type StopRow = {
  id: string;
  order: number;
  scheduledAt: string;
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
  // GPS STOP_PASS로 자동 기록된 통과 시각 (ISO). 미통과면 null.
  arrivedAtISO: string | null;
  // 직전 통과 정류장과의 구간 소요(초). 첫 stop·미통과면 null.
  segmentSec: number | null;
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
  backHref,
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
  // 상단 ← 버튼 목적지 (driver=/run, helper=/helper-run)
  backHref: string;
  route: { name: string; direction: "PICKUP" | "DROPOFF" };
  vehicle: { plate: string; mode: "KIDS" | "GENERAL" };
  stops: StopRow[];
  isKidsMode: boolean;
  startedAtISO: string | null;
  safetyCheck: {
    seatbeltAllOk: boolean;
    helperPresent: boolean;
    allAlightedOk: boolean;
    // W26-A: 9 항목 영구 저장 (refac Driver Run.html)
    emergencyLightOk: boolean;
    doorLockOk: boolean;
    capacityOk: boolean;
    cabinLockOk: boolean;
    keyReturnedOk: boolean;
    recordReviewedOk: boolean;
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

  // W23+: 정류장 수기 "도착" 마킹 — GPS 자동 감지 안 됐을 때.
  const [manualPassed, setManualPassed] = useState<Set<string>>(new Set());
  const [stopPassPending, setStopPassPending] = useState<Set<string>>(
    new Set(),
  );

  // 정류장 통과 callback — refac 02 layout에서는 60초 미처리 강조 미사용.
  // GpsTracker가 STOP_PASS 자동 등록만 하면 됨. handle은 idempotent no-op.
  const handleStopPassed = useCallback(() => {
    // no-op
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
        // Next.js redirect/notFound는 internal signal — re-throw해서
        // framework가 navigation 처리하게.
        if (
          typeof err === "object" &&
          err !== null &&
          typeof (err as { digest?: unknown }).digest === "string" &&
          (err as { digest: string }).digest.startsWith("NEXT_")
        ) {
          throw err;
        }
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

  // refac .run-top: top status strip — 백 버튼 + 노선·방향·진행도 + 시작·경과 + 알림·긴급
  const passedCount = new Set([...gps.passed, ...manualPassed]).size;
  // KIDS 모드 동승자 미배정 + 학생 1명 이상이면 §53⑦ 위반 — 별도 알림 띠
  const helperMissing =
    isKidsMode &&
    !helper &&
    stops.reduce((acc, s) => acc + s.students.length, 0) >= 1;

  // refac 01 frame: KIDS 모드 + 출발 전 안전점검 미완료면 dedicated pre-trip 화면.
  // 운전 중 화면(02)을 보기 전에 안전점검 완료 강제 — 도교법 §53 의무.
  // W26-A 후속 fix: 4개 schema-backed 항목 + helperPresent 자동 mark 모두 true여야
  // 통과. 이전엔 seatbelt + helperPresent 2개만 보고 통과시켜서 신규 3개
  // (emergencyLightOk·doorLockOk·capacityOk) 미체크 상태로 Running view 진입 가능했음.
  const preTripIncomplete =
    isKidsMode &&
    isDriver &&
    (!safetyCheck?.seatbeltAllOk ||
      !safetyCheck?.helperPresent ||
      !safetyCheck?.emergencyLightOk ||
      !safetyCheck?.doorLockOk ||
      !safetyCheck?.capacityOk);
  if (preTripIncomplete) {
    return (
      <PreTripCheckScreen
        tripId={tripId}
        routeName={route.name}
        direction={route.direction}
        vehicleMode={vehicle.mode}
        vehiclePlate={vehicle.plate}
        helperName={helper?.name ?? null}
        driverName={driver.name}
        safetyCheck={safetyCheck}
        onComplete={() => {
          // Server action이 이미 즉시 revalidate → re-render 후 preTripIncomplete=false
        }}
      />
    );
  }

  // refac 03 frame: 모든 stop 통과 + KIDS + 운행 종료 전 → dedicated 도착 후 점검.
  const passedSetForCheck = new Set([...gps.passed, ...manualPassed]);
  const allStopsPassed =
    stops.length > 0 && passedSetForCheck.size >= stops.length;
  const postTripPhase = isKidsMode && isDriver && allStopsPassed;
  if (postTripPhase) {
    const finalStop = stops[stops.length - 1];
    const elapsedMinNum = startedAtISO
      ? Math.max(
          0,
          Math.floor(
            (new Date().getTime() - new Date(startedAtISO).getTime()) / 60000,
          ),
        )
      : 0;
    const nowKstHHmm = new Date(
      new Date().getTime() + 9 * 60 * 60 * 1000,
    )
      .toISOString()
      .slice(11, 16);
    const totalAlighted =
      eventType === "BOARD" ? boardedSet.size : alightedSet.size;
    return (
      <PostTripCheckScreen
        tripId={tripId}
        finalStopName={finalStop?.name ?? "도착"}
        endedHHmm={nowKstHHmm}
        alightedCount={totalAlighted}
        elapsedMinutes={elapsedMinNum}
        distanceKm={0}
        safetyCheck={safetyCheck}
        onEndTrip={handleEnd}
        endPending={endPending}
        backHref={backHref}
      />
    );
  }

  return (
    <main className="bg-background flex min-h-[100dvh] flex-col">
      {/* refac .run-top */}
      <RunTop
        backHref={backHref}
        routeName={route.name}
        direction={route.direction}
        vehicleMode={vehicle.mode}
        passedCount={passedCount}
        totalStops={stops.length}
        startedHHmm={
          startedAtISO
            ? new Date(
                new Date(startedAtISO).getTime() + 9 * 60 * 60 * 1000,
              )
                .toISOString()
                .slice(11, 16)
            : null
        }
        elapsed={elapsed}
        notificationsHref="/run/notifications"
      />

      {/* Wake Lock·KIDS·GPS 경고는 RunTop 아래 한 줄 작은 배너로 노출 */}
      {!wakeLock.supported ? (
        <div className="border-warning bg-warning-soft text-warning border-b px-4 py-2 text-[11px] font-bold">
          <span className="inline-flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            아이폰 사파리는 화면 자동 꺼짐 방지가 안 되니, 화면을 켠 채 운행하세요.
          </span>
        </div>
      ) : null}
      {helperMissing ? (
        <div className="border-destructive bg-destructive/10 text-destructive border-b px-4 py-2 text-[11px] font-extrabold">
          <span className="inline-flex items-center gap-1.5">
            <CircleAlert className="h-3.5 w-3.5" />
            동승보호자가 지정되지 않았어요 (§53⑦)
          </span>
        </div>
      ) : null}
      {gps.error ? (
        <div className="border-destructive bg-destructive-soft text-destructive border-b px-4 py-2">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-extrabold">
            <MapPin className="h-3.5 w-3.5" />
            GPS 신호 없음 — {gps.error}
          </p>
          <button
            type="button"
            onClick={gps.retry}
            className="bg-destructive mt-1 inline-flex items-center rounded-[6px] px-2 py-1 text-[10px] font-black uppercase tracking-[0.04em] text-white"
          >
            다시 시도
          </button>
        </div>
      ) : null}

      {/* 본문은 px-4 컨테이너 — RunTop은 px-18로 자체 padding */}
      <div className="space-y-4 px-4 pt-4 pb-6">

      {/* W24-D Phase 2: refac driver-run.jpg "02 · 운행 중" .next-stop hero card.
          다음 정류장(=첫 미통과 stop)을 운전 중 한눈에 노출. ETA는 GPS 거리/30km/h
          간이 추정 (정밀 ETA는 학부모 trip-live의 카카오 API 사용). */}
      {(() => {
        const passedSet = new Set([...gps.passed, ...manualPassed]);
        const next = stops.find((s) => !passedSet.has(s.id));
        if (!next) return null;
        const checked =
          eventType === "BOARD" ? boardedSet : alightedSet;
        const waitingCount = next.students.filter(
          (st) =>
            st.absence?.status !== "ACKNOWLEDGED" &&
            !checked.has(st.id) &&
            !st.issue,
        ).length;
        let etaMin: number | null = null;
        if (gps.fix) {
          const R = 6_371_000;
          const dLat = ((next.lat - gps.fix.latitude) * Math.PI) / 180;
          const dLng = ((next.lng - gps.fix.longitude) * Math.PI) / 180;
          const lat1 = (gps.fix.latitude * Math.PI) / 180;
          const lat2 = (next.lat * Math.PI) / 180;
          const h =
            Math.sin(dLat / 2) ** 2 +
            Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
          const meters = 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
          // 가정 평균속도 25km/h (시내 셔틀) — 정밀하진 않지만 한눈 ETA로 충분
          etaMin = Math.max(1, Math.round(meters / 1000 / 25 * 60));
        }
        return (
          <NextStopCard
            nextStopName={next.name}
            nextStopOrder={next.order}
            totalStops={stops.length}
            scheduledAt={next.scheduledAt}
            waitingCount={waitingCount}
            etaMin={etaMin}
          />
        );
      })()}

      {/* W25 P0-B: ground truth Driver Run.html §02 frame — 다음 정류장 hero +
          풀폭 노란 "📍 정류장 도착" CTA. 작은 list 안의 도착 버튼은 fallback. */}
      {isDriver ? (
        <NextStopHero
          tripId={tripId}
          stops={stops}
          passed={gps.passed}
          manualPassed={manualPassed}
          stopPassPending={stopPassPending}
          onArrive={(s) => {
            setStopPassPending((p) => new Set(p).add(s.id));
            setManualPassed((p) => new Set(p).add(s.id));
            void markStopPassedAction(tripId, s.id)
              .then(() => toast.success(`${s.name} 도착으로 기록했어요`))
              .catch((err) => {
                setManualPassed((p) => {
                  const n = new Set(p);
                  n.delete(s.id);
                  return n;
                });
                toast.error(
                  err instanceof Error ? err.message : "도착 마킹에 실패했어요",
                );
              })
              .finally(() => {
                setStopPassPending((p) => {
                  const n = new Set(p);
                  n.delete(s.id);
                  return n;
                });
              });
          }}
        />
      ) : null}

      {/* Helper picker — driver만 */}
      {isDriver ? (
        <HelperPicker
          tripId={tripId}
          current={helper}
          options={helperCandidates}
        />
      ) : null}

      {/* W24-D Phase 2: pre-trip 안전점검은 별도 PreTripCheckScreen으로 phase 분리.
          모든 stop 통과 후 post-trip 안전점검도 별도 PostTripCheckScreen 분리.
          running view 자체에는 더이상 SafetyCheckCard inline 노출 안 함. */}

      {/* refac .pickup-wrap — 다음 정류장 학생 + 이전 정류장 완료 학생 두 그룹.
          stop별 grouping(이전 row) → status별 grouping(refac idiom)으로 전환. */}
      {(() => {
        const passedSet = new Set([...gps.passed, ...manualPassed]);
        const nextStop = stops.find((s) => !passedSet.has(s.id));
        // 미처리 학생 = 다음 stop 학생 중 ack 결석/체크/이슈 아닌 학생
        // 완료 학생 = 모든 stop 학생 중 boarded/absent/no-show + 이전 stop의 미체크
        const upcoming = nextStop?.students ?? [];
        const completedAll: { stop: (typeof stops)[number]; student: (typeof upcoming)[number] }[] = [];
        for (const stop of stops) {
          if (!passedSet.has(stop.id) && nextStop && stop.id === nextStop.id)
            continue;
          for (const st of stop.students) {
            completedAll.push({ stop, student: st });
          }
        }
        // upcoming 중에서도 이미 처리된 학생은 completedAll로 이동
        const processedAtNext = upcoming.filter(
          (st) =>
            st.absence?.status === "ACKNOWLEDGED" ||
            checkedSet.has(st.id) ||
            !!st.issue,
        );
        const upcomingPending = upcoming.filter(
          (st) => !processedAtNext.includes(st),
        );
        const upcomingCount = upcomingPending.length;

        return (
          <section className="-mx-4">
            {/* refac .pickup: padding 14/18/14 */}
            <div className="px-[18px] py-[14px]">
              {nextStop && upcoming.length > 0 ? (
                <>
                  {/* refac .pickup-head: justify-between mb-10px */}
                  <div className="mb-[10px] flex items-center justify-between">
                    <h3 className="text-muted-foreground text-[13px] font-black uppercase tracking-[0.06em]">
                      {nextStop.name} — {eventType === "BOARD" ? "탑승" : "하차"} 예정
                    </h3>
                    <p className="text-muted-foreground text-[11px] font-bold">
                      <strong className="text-bus font-black">
                        {upcoming.length - upcomingCount}
                      </strong>{" "}
                      / {upcoming.length}
                    </p>
                  </div>
                  {upcomingPending.map((st) => (
                    <StudentRow
                      key={st.id}
                      tripId={tripId}
                      studentId={st.id}
                      studentName={st.name}
                      meta={`보호자 알림 발송 가능 · ${nextStop.name}`}
                      variant={"pending"}
                      eventType={eventType}
                      gpsLat={gps.fix?.latitude ?? null}
                      gpsLng={gps.fix?.longitude ?? null}

                    />
                  ))}
                  {processedAtNext.map((st) => {
                    const variant: "boarded" | "absent" | "no-show" = st.issue
                      ? "no-show"
                      : st.absence?.status === "ACKNOWLEDGED"
                        ? "absent"
                        : "boarded";
                    const meta =
                      variant === "no-show"
                        ? `미${eventType === "BOARD" ? "탑승" : "하차"} · ${nextStop.name}`
                        : variant === "absent"
                          ? `학부모 결석 신청 · ${st.absence?.reason ?? "사유 미입력"}`
                          : `${nextStop.name} · ${eventType === "BOARD" ? "탑승" : "하차"}됨`;
                    return (
                      <StudentRow
                        key={st.id}
                        tripId={tripId}
                        studentId={st.id}
                        studentName={st.name}
                        meta={meta}
                        variant={variant}
                        eventType={eventType}
                        gpsLat={gps.fix?.latitude ?? null}
                        gpsLng={gps.fix?.longitude ?? null}

                      />
                    );
                  })}
                </>
              ) : null}

              {/* 이전 정류장 (완료) */}
              {completedAll.length > 0 ? (
                <>
                  <div className="mt-[18px] mb-[10px] flex items-center justify-between">
                    <h3 className="text-muted-foreground text-[13px] font-black uppercase tracking-[0.06em]">
                      이전 정류장 (완료)
                    </h3>
                    <p className="text-muted-foreground text-[11px] font-bold tabular-nums">
                      {completedAll.filter(
                        (e) =>
                          checkedSet.has(e.student.id) ||
                          e.student.absence?.status === "ACKNOWLEDGED",
                      ).length}{" "}
                      / {completedAll.length}
                    </p>
                  </div>
                  {completedAll.map(({ stop, student: st }) => {
                    const variant: "pending" | "boarded" | "absent" | "no-show" = st.issue
                      ? "no-show"
                      : st.absence?.status === "ACKNOWLEDGED"
                        ? "absent"
                        : checkedSet.has(st.id)
                          ? "boarded"
                          : "pending";
                    const meta =
                      variant === "no-show"
                        ? `미${eventType === "BOARD" ? "탑승" : "하차"} · ${stop.name} · 보호자 알림 발송`
                        : variant === "absent"
                          ? `학부모 결석 신청 · ${st.absence?.reason ?? "사유 미입력"}`
                          : variant === "boarded"
                            ? `${stop.name} · ${stop.scheduledAt} ${eventType === "BOARD" ? "탑승" : "하차"}`
                            : `${stop.name} · 미처리`;
                    return (
                      <StudentRow
                        key={`${stop.id}-${st.id}`}
                        tripId={tripId}
                        studentId={st.id}
                        studentName={st.name}
                        meta={meta}
                        variant={variant}
                        eventType={eventType}
                        gpsLat={gps.fix?.latitude ?? null}
                        gpsLng={gps.fix?.longitude ?? null}

                      />
                    );
                  })}
                </>
              ) : null}
            </div>

            {/* refac run-bottom: progress-mini + btn-big */}
            <div
              className="bg-background border-border sticky bottom-0 flex flex-col gap-2 border-t px-[16px] pt-[12px]"
              style={{
                paddingBottom: "max(22px, env(safe-area-inset-bottom))",
              }}
            >
              {/* progress-mini: 진행 + bar + count */}
              {stops.length > 0 ? (
                <div className="flex items-center gap-[10px] px-1 text-[11px] font-extrabold text-muted-foreground">
                  <span>진행</span>
                  <div className="bg-muted h-[5px] flex-1 overflow-hidden rounded-full">
                    <div
                      className="bg-bus h-full"
                      style={{
                        width: `${Math.round((passedSet.size / stops.length) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="tabular-nums">
                    {passedSet.size} / {stops.length}
                  </span>
                </div>
              ) : null}
              {/* primary btn-big: 다음 stop이 있으면 "정류장 도착", 없으면 "운행 종료" */}
              {nextStop ? (
                <BtnBig
                  variant="primary"
                  icon={<MapPin />}
                  disabled={stopPassPending.has(nextStop.id)}
                  onClick={() => {
                    setStopPassPending((p) => new Set(p).add(nextStop.id));
                    setManualPassed((p) => new Set(p).add(nextStop.id));
                    void markStopPassedAction(tripId, nextStop.id)
                      .then(() => {
                        toast.success(`${nextStop.name} 도착으로 기록했어요`);
                      })
                      .catch((err) => {
                        setManualPassed((p) => {
                          const n = new Set(p);
                          n.delete(nextStop.id);
                          return n;
                        });
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : "도착 마킹에 실패했어요",
                        );
                      })
                      .finally(() => {
                        setStopPassPending((p) => {
                          const n = new Set(p);
                          n.delete(nextStop.id);
                          return n;
                        });
                      });
                  }}
                >
                  {stopPassPending.has(nextStop.id) ? "처리 중..." : "정류장 도착"}
                </BtnBig>
              ) : (
                <BtnBig
                  variant="danger"
                  icon={<Square />}
                  disabled={endPending}
                  onClick={handleEnd}
                >
                  {endPending ? "종료 중..." : "운행 종료"}
                </BtnBig>
              )}
            </div>
          </section>
        );
      })()}

      {/* 전원 하차 확인 — KIDS 모드 종료 전 */}
      {isKidsMode ? (
        <SafetyCheckCard
          tripId={tripId}
          phase="post"
          safetyCheck={safetyCheck}
        />
      ) : null}

      {/* 운행 종료 에러 안내 — BtnBig 위 sticky run-bottom에서 처리하지 못한 에러만 별도 노출 */}
      {endError ? (
        <p
          className="text-destructive px-4 py-2 text-xs font-bold"
          role="alert"
        >
          {endError}
        </p>
      ) : null}
      {!isDriver && isHelper ? (
        <p className="text-muted-foreground px-4 pt-2 text-center text-xs font-medium">
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
      </div>
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

// W25 P0-B: ground truth Driver Run.html §02 frame — 다음 정류장 hero +
// 풀폭 검정 "📍 정류장 도착" CTA. dark gradient 헤더 직하단에 sticky로 둘 수도
// 있지만, 우선 inline section으로. 모든 정류장 통과 시 render 안 함.
function NextStopHero({
  tripId,
  stops,
  passed,
  manualPassed,
  stopPassPending,
  onArrive,
}: {
  tripId: string;
  stops: StopRow[];
  passed: Set<string>;
  manualPassed: Set<string>;
  stopPassPending: Set<string>;
  onArrive: (stop: StopRow) => void;
}) {
  void tripId; // 인터페이스 일관성 — 추후 logging·analytics용
  const next = stops.find(
    (s) => !passed.has(s.id) && !manualPassed.has(s.id),
  );
  if (!next) {
    // 모든 정류장 통과
    return (
      <section className="bg-success-soft text-success border-success/30 rounded-lg border-2 px-4 py-3 text-center">
        <p className="text-sm font-black tracking-tight">
          ✓ 모든 정류장 통과
        </p>
        <p className="mt-0.5 text-[11px] font-bold opacity-80">
          운행을 종료해 주세요.
        </p>
      </section>
    );
  }

  const remaining = stops.length - passed.size - manualPassed.size;
  const isPending = stopPassPending.has(next.id);

  return (
    <section className="bg-bus relative overflow-hidden rounded-2xl px-4 py-4 shadow-[var(--shadow-live)]">
      {/* decorative 우상단 검정 5% 원 */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-black/5"
      />
      <p className="text-bus-foreground/85 relative text-[10px] font-black tracking-wide uppercase">
        다음 정류장
      </p>
      <h2 className="text-bus-foreground relative mt-1 text-2xl leading-tight font-black tracking-tighter">
        {next.name}
      </h2>
      <p className="text-bus-foreground/80 relative mt-1 text-xs font-bold tabular-nums">
        {next.order}번째 / {stops.length} · 남은 정류장 {remaining}개 ·{" "}
        {next.scheduledAt} 예정
      </p>
      <button
        type="button"
        disabled={isPending}
        onClick={() => onArrive(next)}
        className="text-bus relative mt-3 flex h-12 w-full items-center justify-center gap-1.5 rounded-md bg-black/85 text-base font-black tracking-tight transition-colors active:bg-black/95 disabled:opacity-60"
      >
        <MapPin className="h-4 w-4" />
        {isPending ? "기록 중..." : "정류장 도착"}
      </button>
    </section>
  );
}
