"use client";

import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useWakeLock } from "@/lib/wake-lock/use-wake-lock";

import {
  assignHelperAction,
  endTripAction,
  toggleBoardingEventAction,
  upsertSafetyCheckAction,
  type SafetyFieldsInput,
} from "../../run/actions";
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
      | { status: "PENDING" | "NOTIFIED_DRIVER" | "ACKNOWLEDGED"; reason: string | null }
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
  function handleEnd() {
    if (isKidsMode && !safetyCheck?.allAlightedOk) {
      if (
        !confirm(
          "전원 하차 확인이 체크되지 않았습니다. 그래도 운행을 종료할까요?",
        )
      )
        return;
    } else if (
      !confirm("운행을 종료할까요? 종료 후에는 GPS 송신이 멈춥니다.")
    ) {
      return;
    }
    setEndError(null);
    startEndTransition(async () => {
      try {
        await endTripAction(tripId);
      } catch (err) {
        setEndError(err instanceof Error ? err.message : "종료 실패");
      }
    });
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      {!wakeLock.supported ? (
        <Card className="border-amber-300 bg-amber-50/60">
          <CardHeader className="py-3">
            <CardTitle className="text-sm text-amber-900">
              ⚠️ 화면 자동 꺼짐 방지가 지원되지 않습니다
            </CardTitle>
            <CardDescription className="text-xs">
              iOS Safari는 Wake Lock 미지원. 안드로이드 폰을 거치대에 두고
              화면을 켜둔 채 운행하세요.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {/* KIDS 모드 동승보호자 미선택 경고 — 도교법 §53⑦ */}
      {isKidsMode &&
      !helper &&
      stops.reduce((acc, s) => acc + s.students.length, 0) >= 1 ? (
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">
              ⚠️ 동승보호자가 지정되지 않았어요
            </CardTitle>
            <CardDescription>
              도교법 §53⑦에 따라 어린이통학버스 운행에는 동승보호자가 함께
              타야 합니다. 아래에서 동승자를 지정한 후 운행을 진행해 주세요.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {/* 운행 헤드 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">{route.name}</CardTitle>
              <CardDescription className="mt-1 flex flex-wrap gap-2 text-xs">
                <span
                  className={
                    route.direction === "PICKUP"
                      ? "rounded-md bg-emerald-100 px-2 py-0.5 font-medium text-emerald-900"
                      : "rounded-md bg-sky-100 px-2 py-0.5 font-medium text-sky-900"
                  }
                >
                  {DIRECTION_LABEL[route.direction]}
                </span>
                <span className="text-muted-foreground">
                  [{vehicle.mode}] {vehicle.plate}
                </span>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground text-xs">경과</div>
              <div className="font-mono text-2xl font-semibold">{elapsed}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                wakeLock.active
                  ? "rounded-md bg-emerald-100 px-2 py-0.5 font-medium text-emerald-900"
                  : "rounded-md bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700"
              }
            >
              화면 잠금 방지: {wakeLock.active ? "ON" : "OFF"}
            </span>
            <span
              className={
                gps.fix
                  ? "rounded-md bg-emerald-100 px-2 py-0.5 font-medium text-emerald-900"
                  : gps.error
                    ? "rounded-md bg-rose-100 px-2 py-0.5 font-medium text-rose-900"
                    : "rounded-md bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700"
              }
            >
              GPS:{" "}
              {gps.fix
                ? `±${Math.round(gps.fix.accuracy)}m`
                : gps.error
                  ? "오류"
                  : "수신 대기"}
            </span>
            {isKidsMode ? (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
                KIDS 모드
              </span>
            ) : null}
            {isDriver ? (
              <span className="rounded-md bg-violet-100 px-2 py-0.5 font-medium text-violet-900">
                기사 · {driver.name}
              </span>
            ) : null}
            {isHelper ? (
              <span className="rounded-md bg-sky-100 px-2 py-0.5 font-medium text-sky-900">
                동승 · {helper?.name ?? "—"}
              </span>
            ) : null}
          </div>
          {wakeLock.error ? (
            <p className="text-destructive">{wakeLock.error}</p>
          ) : null}
          {gps.error ? (
            <p className="text-destructive">GPS: {gps.error}</p>
          ) : null}
          {gps.fix ? (
            <p className="text-muted-foreground font-mono">
              위도 {gps.fix.latitude.toFixed(6)}, 경도{" "}
              {gps.fix.longitude.toFixed(6)}
            </p>
          ) : null}
        </CardContent>
      </Card>

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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            정류장·{eventType === "BOARD" ? "탑승" : "하차"} 체크
          </CardTitle>
          <CardDescription>
            {stops.length}개 정류장 중 통과 {gps.passed.size}개. 정류장을 지나면
            그 정류장 학생들의 {eventType === "BOARD" ? "탑승" : "하차"}을
            체크하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ol className="divide-y">
            {stops.map((s) => {
              const isPassed = gps.passed.has(s.id);
              return (
                <li key={s.id} className="px-4 py-3">
                  <div className="flex items-center gap-3 text-sm">
                    <span
                      className={
                        isPassed
                          ? "flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 font-mono text-xs text-white"
                          : "bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs"
                      }
                    >
                      {isPassed ? "✓" : s.order}
                    </span>
                    <span
                      className={
                        isPassed
                          ? "flex-1 font-medium line-through"
                          : "flex-1 font-medium"
                      }
                    >
                      {s.name}
                    </span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {s.scheduledAt}
                    </span>
                  </div>
                  {s.students.length > 0 ? (
                    <ul className="mt-2 space-y-1 pl-11">
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
                        />
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground mt-1 pl-11 text-xs">
                      배정된 학생 없음
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

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
        <Card className="border-rose-200 bg-rose-50/40">
          <CardContent className="pt-6">
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="w-full"
              disabled={endPending}
              onClick={handleEnd}
            >
              {endPending ? "종료 중..." : "운행 종료"}
            </Button>
            {endError ? (
              <p className="text-destructive mt-2 text-sm" role="alert">
                {endError}
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="text-muted-foreground text-xs">
            종료를 누르면 GPS 송신이 멈추고 운행 기록이 마감됩니다.
          </CardFooter>
        </Card>
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
    <Card className="border-amber-200 bg-amber-50/40">
      <CardHeader className="py-3">
        <CardTitle className="text-sm text-amber-900">
          {phase === "pre"
            ? "출발 전 안전점검 (KIDS)"
            : "종료 전 전원 하차 확인 (KIDS)"}
        </CardTitle>
        <CardDescription className="text-xs">
          {phase === "pre"
            ? "도교법 §53⑦ 안전운행기록 원천 데이터. 출발 전 반드시 확인."
            : "운행 종료 전 전원 하차 여부를 확인하세요."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
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
          <p className="text-destructive text-xs" role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
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
          ? "flex w-full items-center gap-3 rounded-md border border-emerald-300 bg-emerald-100/60 px-3 py-2 text-left text-sm font-medium text-emerald-900"
          : "border-input bg-background hover:bg-accent flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm"
      }
    >
      <span
        className={
          checked
            ? "flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500 text-xs text-white"
            : "border-input flex h-5 w-5 items-center justify-center rounded-md border"
        }
      >
        {checked ? "✓" : ""}
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
}: {
  tripId: string;
  studentId: string;
  studentName: string;
  type: "BOARD" | "ALIGHT";
  checked: boolean;
  gpsLat: number | null;
  gpsLng: number | null;
  absence:
    | { status: "PENDING" | "NOTIFIED_DRIVER" | "ACKNOWLEDGED"; reason: string | null }
    | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
      <li className="flex items-center gap-2 text-sm">
        <button
          type="button"
          disabled={pending}
          onClick={toggle}
          className={
            checked
              ? "flex flex-1 items-center gap-2 rounded-md border border-emerald-300 bg-emerald-100/60 px-2 py-1.5 text-left text-sm font-medium text-emerald-900"
              : "border-muted-foreground/20 bg-muted/40 text-muted-foreground hover:bg-muted flex flex-1 items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm line-through decoration-slate-400"
          }
        >
          <span
            className={
              checked
                ? "flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500 text-xs text-white"
                : "border-muted-foreground/30 flex h-5 w-5 items-center justify-center rounded-md border"
            }
          >
            {checked ? "✓" : ""}
          </span>
          <span className="flex-1">{studentName}</span>
          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
            {ackLabel}
          </span>
          <span className="text-muted-foreground text-xs">
            {type === "BOARD" ? "탑승" : "하차"}
          </span>
        </button>
        {absence.reason ? (
          <span className="text-muted-foreground text-[10px]">
            ({absence.reason})
          </span>
        ) : null}
        {error ? <span className="text-destructive text-xs">{error}</span> : null}
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 text-sm">
      <button
        type="button"
        disabled={pending}
        onClick={toggle}
        className={
          checked
            ? "flex flex-1 items-center gap-2 rounded-md border border-emerald-300 bg-emerald-100/60 px-2 py-1.5 text-left text-sm font-medium text-emerald-900"
            : "border-input bg-background hover:bg-accent flex flex-1 items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm"
        }
      >
        <span
          className={
            checked
              ? "flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500 text-xs text-white"
              : "border-input flex h-5 w-5 items-center justify-center rounded-md border"
          }
        >
          {checked ? "✓" : ""}
        </span>
        <span className="flex-1">{studentName}</span>
        <span className="text-muted-foreground text-xs">
          {type === "BOARD" ? "탑승" : "하차"}
        </span>
      </button>
      {error ? <span className="text-destructive text-xs">{error}</span> : null}
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
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">동승보호자</CardTitle>
          <CardDescription className="text-xs">
            등록된 동승자가 없습니다. 학원장·원장이 직원 페이지에서 초대 후
            가입하면 여기 표시됩니다.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm">동승보호자 지정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <select
          value={value}
          disabled={pending}
          onChange={(e) => commit(e.target.value)}
          className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs"
        >
          <option value="">— 동승자 없음 —</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        {error ? (
          <p className="text-destructive text-xs" role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
