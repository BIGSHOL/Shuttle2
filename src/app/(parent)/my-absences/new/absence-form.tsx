"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { FormBackHeader } from "@/components/shuttlee/form-back-header";

import {
  createAbsenceRequestAction,
  type CreateAbsenceState,
} from "../actions";

// W24-D Phase 1: refac Parent App.html "03 · /absences/new" 픽셀 단위 align.
// 모든 px 값은 refac CSS 그대로:
//
//   .form-content{padding:8px 16px 100px}
//   .form-section-title{font-size:11px;font-weight:900;letter-spacing:0.06em;
//     text-transform:uppercase;color:var(--muted-foreground);margin:18px 0 8px}
//   .form-section-title:first-child{margin-top:8px}
//   .opt-list{display:flex;flex-direction:column;gap:8px}
//   .opt{padding:14px;background:var(--card);border:1.5px solid var(--border);
//     border-radius:12px;display:flex;gap:12px;align-items:center}
//   .opt.on{border-color:var(--bus);background:var(--bus-soft)}
//   .opt-radio{width:20px;height:20px;border-radius:999px;border:2px solid var(--border);background:#fff}
//   .opt.on .opt-radio{border-color:var(--bus-foreground)}
//   .opt.on .opt-radio::after{width:10px;height:10px;border-radius:999px;background:var(--bus-foreground)}
//   .opt-name{font-size:14px;font-weight:900}
//   .opt-desc{font-size:11px;color:var(--muted-foreground);font-weight:700;margin-top:3px}
//   .chip-row{display:flex;gap:6px;flex-wrap:wrap}
//   .chip{padding:8px 12px;border:1.5px solid var(--border);border-radius:999px;
//     background:var(--card);font-size:12px;font-weight:800}
//   .chip.on{background:var(--bus);border-color:var(--bus);color:var(--bus-foreground)}
//   .cal{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px}
//   .cal-grid{grid-cols-7;gap:2px;text-align:center}
//   .cal-grid .day{font-size:13px;font-weight:700;padding:8px 0;border-radius:8px}
//   .cal-grid .day.sel{background:var(--bus);color:var(--bus-foreground);font-weight:900}
//   .cal-grid .day.today{outline:2px solid var(--info);outline-offset:-2px}
//   .summary{background:var(--info-soft);border:1px solid color-mix(info 25%);
//     border-radius:12px;padding:12px;margin-top:14px}
//   .bottom-cta{position:absolute;bottom:0;background:var(--card);border-top:1px solid var(--border);padding:12px 16px 24px}
//   .bottom-cta button{height:48px;background:var(--bus);border-radius:12px;font-size:15px;font-weight:900}

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

function todayKstParts(): { y: number; m: number; d: number; weekday: number } {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
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
  const first = new Date(Date.UTC(year, month - 1, 1));
  const firstWeekday = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
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

      <form action={formAction} className="relative">
        {/* hidden inputs */}
        <input type="hidden" name="studentId" value={studentId} />
        <input type="hidden" name="date" value={selectedDate} />
        <input type="hidden" name="type" value={absenceType} />
        <input type="hidden" name="reason" value={reason} />

        {/* refac .form-content { padding: 8px 16px 100px } */}
        <div className="px-4 pt-2 pb-[100px]">
          {/* refac .form-section-title:first-child { margin-top: 8px } */}
          <SectionTitle first>아이 선택</SectionTitle>
          <OptList>
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
                  <p className="text-[14px] font-black">
                    {s.name}
                    <span className="bg-muted text-muted-foreground ml-1.5 inline-flex items-center rounded-[4px] px-[7px] py-[2px] align-middle text-[10px] font-black uppercase tracking-[0.04em]">
                      {s.age}세 · {s.orgName}
                    </span>
                  </p>
                  {s.sub ? (
                    <p className="text-muted-foreground mt-[3px] text-[11px] font-bold">
                      {s.sub}
                    </p>
                  ) : null}
                </OptCard>
              ))
            )}
          </OptList>
          {state.fieldErrors?.studentId ? (
            <p className="text-destructive mt-1.5 text-xs font-bold">
              {state.fieldErrors.studentId[0]}
            </p>
          ) : null}

          <SectionTitle>기간 선택</SectionTitle>
          {/* refac .chip-row { gap: 6px; flex-wrap: wrap; margin-bottom: 10px } */}
          <div className="mb-[10px] flex flex-wrap gap-[6px]">
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

          {/* refac .cal: bg-card, border, rounded-12px, padding 12px */}
          <div className="bg-card border-border rounded-[12px] border p-[12px]">
            <div className="mb-[10px] flex items-center justify-between">
              <button
                type="button"
                onClick={monthPrev}
                className="text-muted-foreground grid h-7 w-7 place-items-center"
                aria-label="이전 달"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-[13px] font-black">
                {calYear}년 {calMonth}월
              </p>
              <button
                type="button"
                onClick={monthNext}
                className="text-muted-foreground grid h-7 w-7 place-items-center"
                aria-label="다음 달"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {/* refac .cal-grid { grid-cols-7, gap-2px, text-center } */}
            <div className="grid grid-cols-7 gap-[2px] text-center">
              {WEEKDAY_LABELS.map((dow) => (
                <p
                  key={dow}
                  className="text-muted-foreground py-[6px] text-[10px] font-black"
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
                    className={`rounded-[8px] py-[8px] text-[13px] tabular-nums ${
                      isSel
                        ? "bg-bus text-bus-foreground font-black"
                        : c.dim || isPast
                          ? "text-muted-foreground/50 font-bold"
                          : isToday
                            ? "outline-info -outline-offset-2 outline-2 font-bold"
                            : "font-bold"
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

          <SectionTitle>결석 유형</SectionTitle>
          <OptList>
            {ABSENCE_TYPES.map((t) => (
              <OptCard
                key={t.value}
                selected={absenceType === t.value}
                onSelect={() => setAbsenceType(t.value)}
              >
                <p className="text-[14px] font-black">{t.name}</p>
                <p className="text-muted-foreground mt-[3px] text-[11px] font-bold">
                  {t.desc}
                </p>
              </OptCard>
            ))}
          </OptList>
          {state.fieldErrors?.type ? (
            <p className="text-destructive mt-1.5 text-xs font-bold">
              {state.fieldErrors.type[0]}
            </p>
          ) : null}

          <SectionTitle>사유 (선택)</SectionTitle>
          {/* refac .field { display: flex; flex-direction: column; gap: 6px } */}
          <div className="flex flex-col gap-1.5">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 200))}
              placeholder="병원 진료 · 가족 행사 등 (학원장에게만 보입니다)"
              className="bg-card border-border focus:border-bus focus:outline-bus min-h-[80px] w-full resize-y rounded-[10px] border px-[13px] py-[12px] text-[14px] font-semibold focus:outline-2"
            />
            {/* refac .hint: 11px font-600 muted line-height-1.4 */}
            <p className="text-muted-foreground text-[11px] font-semibold leading-[1.4]">
              사유를 적어두면 학원장 확인이 빨라집니다.
            </p>
          </div>

          {/* refac .summary: bg-info-soft border-info-25%, rounded-12px padding-12px, mt-14px */}
          {selectedStudent ? (
            <div className="bg-info-soft border-info/25 mt-[14px] rounded-[12px] border p-[12px]">
              <h4 className="text-info text-[12px] font-black uppercase tracking-[0.04em]">
                신청 요약
              </h4>
              <p className="mt-1.5 text-[13px] font-bold leading-[1.5]">
                <strong className="font-black">{selectedStudent.name}</strong> ·{" "}
                {selectedDateLabel}{" "}
                <strong className="font-black">
                  {TYPE_LABEL_MAP[absenceType]}
                </strong>
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

        {/* refac .bottom-cta: position-absolute bottom-0, bg-card, border-top, padding 12px 16px 24px */}
        <div
          className="bg-card border-border sticky bottom-0 left-0 right-0 border-t px-[16px] pt-[12px]"
          style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
        >
          {/* refac .bottom-cta .meta: 11px font-700 muted mb-8px text-center */}
          <p className="text-muted-foreground mb-[8px] text-center text-[11px] font-bold">
            기사님과 학원장에게 자동 알림됩니다
          </p>
          {/* refac .bottom-cta button: 48px height, bg-bus, rounded-12px, 15px font-900 */}
          <button
            type="submit"
            disabled={pending || !studentId}
            className="bg-bus text-bus-foreground h-[48px] w-full rounded-[12px] text-[15px] font-black disabled:opacity-50"
          >
            {pending ? "신청 중..." : "결석 신청"}
          </button>
        </div>
      </form>
    </>
  );
}

// refac .form-section-title: 11px font-900 caps tracking-0.06em muted, margin 18px 0 8px
function SectionTitle({
  children,
  first,
}: {
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <p
      className={`text-muted-foreground mb-[8px] text-[11px] font-black uppercase tracking-[0.06em] ${
        first ? "mt-[8px]" : "mt-[18px]"
      }`}
    >
      {children}
    </p>
  );
}

// refac .opt-list: flex flex-col gap-8px
function OptList({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-[8px]">{children}</div>;
}

// refac .opt: padding 14px, bg-card, border 1.5px solid border, rounded-12px, gap 12px
// refac .opt.on: border-bus + bg-bus-soft
// refac .opt-radio: 20x20 round, border 2px solid border, bg-white
// refac .opt.on .opt-radio::after: 10x10 round bg-bus-foreground
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
      className={`flex w-full items-center gap-[12px] rounded-[12px] border-[1.5px] p-[14px] text-left transition-colors ${
        selected ? "border-bus bg-bus-soft" : "border-border bg-card"
      }`}
    >
      <span
        className={`grid h-[20px] w-[20px] shrink-0 place-items-center rounded-full border-2 bg-white ${
          selected ? "border-bus-foreground" : "border-border"
        }`}
        aria-hidden
      >
        {selected ? (
          <span className="bg-bus-foreground h-[10px] w-[10px] rounded-full" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

// refac .chip: padding 8px 12px, border 1.5px solid border, rounded-full, bg-card, 12px font-800
// refac .chip.on: bg-bus, border-bus, text-bus-foreground
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
      className={`rounded-full border-[1.5px] px-[12px] py-[8px] text-[12px] font-extrabold transition-colors ${
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
