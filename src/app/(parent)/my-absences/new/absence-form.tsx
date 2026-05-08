"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { FormBackHeader } from "@/components/shuttlee/form-back-header";

import {
  createAbsenceRequestAction,
  type CreateAbsenceState,
} from "../actions";

// W24-D Phase 1: data/refac/screenshots/parent-app.jpg "03 · /absences/new"
// 풀세트 reproduce. refac 영역 순서:
//   form-back ("결석 신청")
//   - 아이 선택 (opt-list radio cards)
//   - 기간 선택 (chip-row: 하루/연속/반복) + cal grid
//   - 결석 유형 (opt-list 3개)
//   - 사유 (textarea + hint)
//   - summary card (info-soft, "신청 요약")
//   bottom-cta (meta + bus-yellow CTA)
//
// 기간 chip "연속"·"반복" 은 베타 backlog — schema에 endDate·recurring 필드 없음.
// 이번 turn은 visual chip만 두고 "하루"만 functional. action도 single date.

type FormStudent = {
  id: string;
  name: string;
  age: number;
  orgName: string;
  sub: string;
};

const ABSENCE_TYPES: {
  value: "ABSENT_BOTH" | "ABSENT_PICKUP" | "ABSENT_DROPOFF";
  name: string;
  desc: string;
}[] = [
  { value: "ABSENT_BOTH", name: "등하원 모두", desc: "하루 종일 결석합니다" },
  {
    value: "ABSENT_PICKUP",
    name: "등원만 결석",
    desc: "하원은 평소대로 (다른 교통수단으로 등원)",
  },
  {
    value: "ABSENT_DROPOFF",
    name: "하원만 결석",
    desc: "등원은 평소대로 (다른 교통수단으로 하원)",
  },
];

const TYPE_LABEL_MAP = {
  ABSENT_BOTH: "등하원 결석",
  ABSENT_PICKUP: "등원만 결석",
  ABSENT_DROPOFF: "하원만 결석",
} as const;

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

// KST 기준 오늘 00:00 (UTC offset shift 후 0시 자르기)
function todayKstParts(): { y: number; m: number; d: number; weekday: number } {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return {
    y: kst.getUTCFullYear(),
    m: kst.getUTCMonth() + 1,
    d: kst.getUTCDate(),
    weekday: kst.getUTCDay(),
  };
}

function fmtMonthKey(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function buildMonthGrid(year: number, month: number) {
  // month: 1-indexed
  const first = new Date(Date.UTC(year, month - 1, 1));
  const firstWeekday = first.getUTCDay(); // 0=일 ~ 6=토
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  // dim 처리할 prev month 날짜 수 = firstWeekday
  const prevMonthDays = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  const cells: { y: number; m: number; d: number; dim: boolean }[] = [];
  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push({
      y: month === 1 ? year - 1 : year,
      m: month === 1 ? 12 : month - 1,
      d: prevMonthDays - i,
      dim: true,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ y: year, m: month, d, dim: false });
  }
  // next month padding to 6 weeks (42 cells) — refac은 6주 grid
  let nextD = 1;
  while (cells.length < 42) {
    cells.push({
      y: month === 12 ? year + 1 : year,
      m: month === 12 ? 1 : month + 1,
      d: nextD++,
      dim: true,
    });
  }
  return cells;
}

export function AbsenceForm({ students }: { students: FormStudent[] }) {
  const [state, formAction, pending] = useActionState<
    CreateAbsenceState,
    FormData
  >(createAbsenceRequestAction, {});

  const today = todayKstParts();
  const todayKey = fmtMonthKey(today.y, today.m, today.d);

  const [studentId, setStudentId] = useState<string>(students[0]?.id ?? "");
  const [periodMode, setPeriodMode] = useState<"DAY" | "RANGE" | "REPEAT">(
    "DAY",
  );
  const [calYear, setCalYear] = useState<number>(today.y);
  const [calMonth, setCalMonth] = useState<number>(today.m);
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [absenceType, setAbsenceType] =
    useState<(typeof ABSENCE_TYPES)[number]["value"]>("ABSENT_BOTH");
  const [reason, setReason] = useState<string>("");

  const cells = useMemo(
    () => buildMonthGrid(calYear, calMonth),
    [calYear, calMonth],
  );

  const selectedStudent = students.find((s) => s.id === studentId);
  const selectedDateLabel = (() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(selectedDate);
    if (!m) return null;
    const dateObj = new Date(`${selectedDate}T00:00:00.000Z`);
    return `${parseInt(m[2], 10)}월 ${parseInt(m[3], 10)}일 (${WEEKDAY_LABELS[dateObj.getUTCDay()]})`;
  })();

  const monthPrev = () => {
    if (calMonth === 1) {
      setCalYear(calYear - 1);
      setCalMonth(12);
    } else setCalMonth(calMonth - 1);
  };
  const monthNext = () => {
    if (calMonth === 12) {
      setCalYear(calYear + 1);
      setCalMonth(1);
    } else setCalMonth(calMonth + 1);
  };

  return (
    <>
      <FormBackHeader title="결석 신청" href="/my-absences" />

      <form
        action={formAction}
        className="flex min-h-[calc(100dvh-3rem)] flex-col"
      >
        {/* hidden inputs — selected state → server action */}
        <input type="hidden" name="studentId" value={studentId} />
        <input type="hidden" name="date" value={selectedDate} />
        <input type="hidden" name="type" value={absenceType} />
        <input type="hidden" name="reason" value={reason} />

        <div className="flex-1 px-4 pt-2 pb-28">
          {/* 아이 선택 */}
          <SectionTitle>아이 선택</SectionTitle>
          <div className="space-y-2">
            {students.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                연결된 자녀가 없어요. 학원·기관에 보호자 초대를 요청해 주세요.
              </p>
            ) : (
              students.map((s) => (
                <OptCard
                  key={s.id}
                  selected={studentId === s.id}
                  onSelect={() => setStudentId(s.id)}
                >
                  <p className="text-sm font-black tracking-tight">
                    {s.name}
                    <span className="bg-muted text-muted-foreground ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tracking-tight">
                      {s.age}세 · {s.orgName}
                    </span>
                  </p>
                  {s.sub ? (
                    <p className="text-muted-foreground mt-0.5 text-[11px] font-bold">
                      {s.sub}
                    </p>
                  ) : null}
                </OptCard>
              ))
            )}
          </div>
          {state.fieldErrors?.studentId ? (
            <p className="text-destructive mt-1.5 text-xs font-bold">
              {state.fieldErrors.studentId[0]}
            </p>
          ) : null}

          {/* 기간 선택 */}
          <SectionTitle>기간 선택</SectionTitle>
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            <Chip
              selected={periodMode === "DAY"}
              onSelect={() => setPeriodMode("DAY")}
            >
              하루
            </Chip>
            <Chip
              selected={periodMode === "RANGE"}
              onSelect={() => setPeriodMode("RANGE")}
              disabled
            >
              연속 (시작~종료)
            </Chip>
            <Chip
              selected={periodMode === "REPEAT"}
              onSelect={() => setPeriodMode("REPEAT")}
              disabled
            >
              반복
            </Chip>
          </div>

          {/* calendar */}
          <div className="bg-card rounded-md border p-3">
            <div className="mb-2.5 flex items-center justify-between">
              <button
                type="button"
                onClick={monthPrev}
                className="text-muted-foreground flex h-7 w-7 items-center justify-center"
                aria-label="이전 달"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-[13px] font-black tracking-tight">
                {calYear}년 {calMonth}월
              </p>
              <button
                type="button"
                onClick={monthNext}
                className="text-muted-foreground flex h-7 w-7 items-center justify-center"
                aria-label="다음 달"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {WEEKDAY_LABELS.map((dow) => (
                <p
                  key={dow}
                  className="text-muted-foreground py-1.5 text-[10px] font-black"
                >
                  {dow}
                </p>
              ))}
              {cells.map((c, i) => {
                const key = fmtMonthKey(c.y, c.m, c.d);
                const isSel = !c.dim && key === selectedDate;
                const isToday = !c.dim && key === todayKey;
                const isPast = !c.dim && key < todayKey;
                return (
                  <button
                    key={`${i}-${key}`}
                    type="button"
                    onClick={() => {
                      if (c.dim || isPast) return;
                      setSelectedDate(key);
                    }}
                    disabled={c.dim || isPast}
                    className={`tabular-nums rounded-md py-2 text-[13px] font-bold transition-colors ${
                      isSel
                        ? "bg-bus text-bus-foreground font-black"
                        : c.dim || isPast
                          ? "text-muted-foreground/40"
                          : isToday
                            ? "outline-info -outline-offset-2 outline-2"
                            : "hover:bg-muted/50"
                    }`}
                    aria-label={`${c.m}월 ${c.d}일`}
                  >
                    {c.d}
                  </button>
                );
              })}
            </div>
          </div>
          {state.fieldErrors?.date ? (
            <p className="text-destructive mt-1.5 text-xs font-bold">
              {state.fieldErrors.date[0]}
            </p>
          ) : null}

          {/* 결석 유형 */}
          <SectionTitle>결석 유형</SectionTitle>
          <div className="space-y-2">
            {ABSENCE_TYPES.map((t) => (
              <OptCard
                key={t.value}
                selected={absenceType === t.value}
                onSelect={() => setAbsenceType(t.value)}
              >
                <p className="text-sm font-black tracking-tight">{t.name}</p>
                <p className="text-muted-foreground mt-0.5 text-[11px] font-bold">
                  {t.desc}
                </p>
              </OptCard>
            ))}
          </div>
          {state.fieldErrors?.type ? (
            <p className="text-destructive mt-1.5 text-xs font-bold">
              {state.fieldErrors.type[0]}
            </p>
          ) : null}

          {/* 사유 (선택) */}
          <SectionTitle>사유 (선택)</SectionTitle>
          <div className="space-y-1.5">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 200))}
              placeholder="병원 진료 · 가족 행사 등 (학원장에게만 보입니다)"
              className="bg-card w-full rounded-md border px-3 py-2.5 text-sm font-medium focus:outline-2 focus:outline-bus"
              rows={3}
            />
            <p className="text-muted-foreground text-[11px] font-bold">
              사유를 적어두면 학원장 확인이 빨라집니다.
            </p>
          </div>

          {/* summary */}
          {selectedStudent ? (
            <div className="bg-info-soft border-info/25 mt-4 rounded-md border p-3">
              <p className="text-info text-[11px] font-black tracking-[0.04em] uppercase">
                신청 요약
              </p>
              <p className="mt-1.5 text-[13px] font-bold leading-relaxed">
                <span className="font-black">{selectedStudent.name}</span> ·{" "}
                {selectedDateLabel}{" "}
                <span className="font-black">
                  {TYPE_LABEL_MAP[absenceType]}
                </span>
              </p>
              <p className="text-info mt-1 text-[11px] font-extrabold">
                기사·학원장에게 자동 알림됩니다
              </p>
            </div>
          ) : null}

          {state.error ? (
            <p
              className="text-destructive mt-3 text-sm font-bold"
              role="alert"
            >
              {state.error}
            </p>
          ) : null}
        </div>

        {/* bottom-cta — refac sticky bottom */}
        <div className="bg-card sticky bottom-0 border-t px-4 pt-3 pb-6">
          <p className="text-muted-foreground mb-2 text-center text-[11px] font-bold">
            기사님과 학원장에게 자동 알림됩니다
          </p>
          <button
            type="submit"
            disabled={pending || !studentId}
            className="bg-bus text-bus-foreground h-12 w-full rounded-md text-[15px] font-black disabled:opacity-50"
          >
            {pending ? "신청 중..." : "결석 신청"}
          </button>
        </div>
      </form>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground mt-4 mb-2 text-[11px] font-black tracking-[0.06em] uppercase first:mt-2">
      {children}
    </p>
  );
}

function OptCard({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-md border-[1.5px] p-3.5 text-left transition-colors ${
        selected ? "border-bus bg-bus-soft" : "border-border bg-card"
      }`}
    >
      <span
        className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? "border-bus-foreground" : "border-border bg-card"
        }`}
        aria-hidden
      >
        {selected ? (
          <span className="bg-bus-foreground h-2.5 w-2.5 rounded-full" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

function Chip({
  selected,
  onSelect,
  disabled,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onSelect()}
      disabled={disabled}
      className={`rounded-full border-[1.5px] px-3 py-2 text-xs font-extrabold tracking-tight transition-colors ${
        selected
          ? "bg-bus border-bus text-bus-foreground"
          : disabled
            ? "border-border bg-card text-muted-foreground/60 cursor-not-allowed"
            : "border-border bg-card"
      }`}
    >
      {children}
    </button>
  );
}
