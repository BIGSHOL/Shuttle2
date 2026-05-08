"use client";

import { CheckCircle2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { FormBackHeader } from "@/components/shuttlee/form-back-header";

import {
  createStopChangeRequestAction,
  type CreateStopChangeState,
} from "../actions";

// W24-D Phase 1: refac Parent App.html "04 · /stop-change/new" 픽셀 단위 align.
// refac CSS와 1:1:
//   .stop-pick{padding:12px 14px;background:var(--card);border:1.5px solid var(--border);
//              border-radius:12px;display:flex;gap:12px;align-items:center}
//   .stop-pick.on{border-color:var(--bus);background:var(--bus-soft)}
//   .stop-pick.cur{border-color:var(--info);background:var(--info-soft)}
//   .stop-pick .num{width:26px;height:26px;border-radius:999px;background:var(--muted);
//                   color:var(--muted-foreground);font-size:11px;font-weight:900}
//   .stop-pick.on .num{background:var(--bus);color:var(--bus-foreground)}
//   .stop-pick.cur .num{background:var(--info);color:#fff}
//   .stop-pick .name{font-size:13px;font-weight:800}
//   .stop-pick .meta{font-size:11px;color:var(--muted-foreground);font-weight:700;margin-top:2px}
//   .summary: bg-warning-soft variant on this screen (refac uses warning tone for "30분 이내 승인")

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;
const DIRECTION_DETAIL = {
  PICKUP: "집 → 학원·기관",
  DROPOFF: "학원·기관 → 집",
} as const;

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function todayKstDateString(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

type AllStop = {
  stopId: string;
  stopName: string;
  stopAddress: string | null;
  scheduledAt: string;
  order: number;
  isTerminal: boolean;
};

type Item = {
  routeStudentId: string;
  studentId: string;
  studentName: string;
  routeName: string;
  direction: "PICKUP" | "DROPOFF";
  driverName: string | null;
  fromStopId: string;
  fromStopName: string;
  fromStopOrder: number | null;
  allStops: AllStop[];
};

export function StopChangeForm({ items }: { items: Item[] }) {
  const initialState: CreateStopChangeState = {};
  const [state, formAction, pending] = useActionState(
    createStopChangeRequestAction,
    initialState,
  );

  const [selectedKey, setSelectedKey] = useState<string>(
    items[0]?.routeStudentId ?? "",
  );
  const selected = useMemo(
    () => items.find((i) => i.routeStudentId === selectedKey) ?? null,
    [items, selectedKey],
  );

  const [changeMode, setChangeMode] = useState<
    "ONE_TIME" | "RANGE" | "PERMANENT"
  >("ONE_TIME");
  const [toStopId, setToStopId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [effectiveAt, setEffectiveAt] = useState(todayKstDateString());

  const fieldErr = state.fieldErrors ?? {};

  const toStop = selected?.allStops.find((s) => s.stopId === toStopId);
  const summaryDateLabel = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(effectiveAt);
    if (!m) return null;
    const dateObj = new Date(`${effectiveAt}T00:00:00.000Z`);
    return `${parseInt(m[2], 10)}월 ${parseInt(m[3], 10)}일 (${WEEKDAY_LABELS[dateObj.getUTCDay()]})`;
  }, [effectiveAt]);

  if (items.length === 0) {
    return (
      <>
        <FormBackHeader title="정류장 변경 신청" href="/my-stop-changes" />
        <div className="px-4 py-6">
          <p className="text-muted-foreground text-sm font-bold">
            등록된 자녀와 정류장 정보가 없습니다. 학원장께 문의해 주세요.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <FormBackHeader title="정류장 변경 신청" href="/my-stop-changes" />

      <form action={formAction} className="relative">
        <input
          type="hidden"
          name="studentId"
          value={selected?.studentId ?? ""}
        />
        <input
          type="hidden"
          name="fromStopId"
          value={selected?.fromStopId ?? ""}
        />
        <input type="hidden" name="toStopId" value={toStopId} />
        <input type="hidden" name="effectiveAt" value={effectiveAt} />
        <input type="hidden" name="reason" value={reason} />

        {/* refac .form-content { padding: 8px 16px 100px } */}
        <div className="px-4 pt-2 pb-[100px]">
          <SectionTitle first>아이 · 방향</SectionTitle>
          <OptList>
            {items.map((i) => {
              const k = i.routeStudentId;
              return (
                <OptCard
                  key={k}
                  selected={selectedKey === k}
                  onSelect={() => {
                    setSelectedKey(k);
                    setToStopId("");
                  }}
                >
                  <p className="text-[14px] font-black">
                    {i.studentName} · {DIRECTION_LABEL[i.direction]}{" "}
                    <span className="text-muted-foreground font-bold">
                      ({DIRECTION_DETAIL[i.direction]})
                    </span>
                  </p>
                  <p className="text-muted-foreground mt-[3px] text-[11px] font-bold">
                    {i.routeName}
                    {i.driverName ? ` · ${i.driverName} 기사님` : ""}
                  </p>
                </OptCard>
              );
            })}
          </OptList>

          <SectionTitle>변경 유형</SectionTitle>
          <div className="mb-[12px] flex flex-wrap gap-[6px]">
            <Chip
              selected={changeMode === "ONE_TIME"}
              onSelect={() => setChangeMode("ONE_TIME")}
            >
              이번 한 번만
            </Chip>
            <Chip
              selected={changeMode === "RANGE"}
              onSelect={() => setChangeMode("RANGE")}
              disabled
            >
              기간 지정
            </Chip>
            <Chip
              selected={changeMode === "PERMANENT"}
              onSelect={() => setChangeMode("PERMANENT")}
              disabled
            >
              영구 변경
            </Chip>
          </div>

          {/* refac .field: gap 6px, label 12px font-800, input 44px height 10px radius */}
          <div className="mb-3 flex flex-col gap-[6px]">
            <label htmlFor="effectiveAtUI" className="text-[12px] font-extrabold">
              날짜
            </label>
            <input
              id="effectiveAtUI"
              type="date"
              value={effectiveAt}
              onChange={(e) => setEffectiveAt(e.target.value)}
              min={todayKstDateString()}
              required
              className="bg-card border-border focus:border-bus focus:outline-bus h-[44px] w-full rounded-[10px] border px-[13px] text-[14px] font-semibold focus:outline-2"
            />
          </div>

          {selected ? (
            <>
              <SectionTitle>현재 정류장</SectionTitle>
              {/* refac .stop-pick.cur: border-info bg-info-soft, .num: 26x26 round bg-info color-white */}
              <div className="bg-info-soft border-info flex items-center gap-[12px] rounded-[12px] border-[1.5px] px-[14px] py-[12px]">
                <span className="bg-info grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full text-[11px] font-black text-white">
                  {selected.fromStopOrder ?? "·"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-extrabold">
                    {selected.fromStopName}
                  </p>
                  <p className="text-muted-foreground mt-[2px] text-[11px] font-bold">
                    평소 사용 정류장
                  </p>
                </div>
                <CheckCircle2
                  className="text-info h-[18px] w-[18px] shrink-0"
                  aria-hidden
                />
              </div>
            </>
          ) : null}

          {selected ? (
            <>
              <p className="text-muted-foreground mt-[18px] mb-[8px] text-[11px] font-black uppercase tracking-[0.06em]">
                변경할 정류장{" "}
                <span className="text-muted-foreground/80 font-bold normal-case tracking-normal">
                  · {selected.routeName} 정류장 중 선택
                </span>
              </p>
              {/* refac .stop-list: flex flex-col gap-6px */}
              <ul className="flex flex-col gap-[6px]">
                {selected.allStops.map((s) => {
                  const isCurrent = s.stopId === selected.fromStopId;
                  const isSelected = s.stopId === toStopId;
                  const disabled = isCurrent || s.isTerminal;
                  return (
                    <li key={s.stopId}>
                      <button
                        type="button"
                        onClick={() => {
                          if (disabled) return;
                          setToStopId(s.stopId);
                        }}
                        disabled={disabled}
                        // refac .stop-pick padding 12px 14px
                        className={`flex w-full items-center gap-[12px] rounded-[12px] border-[1.5px] px-[14px] py-[12px] text-left transition-colors ${
                          isSelected
                            ? "border-bus bg-bus-soft"
                            : isCurrent
                              ? "border-border bg-muted/40 opacity-60"
                              : disabled
                                ? "border-border bg-card opacity-50"
                                : "border-border bg-card"
                        }`}
                      >
                        <span
                          className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full text-[11px] font-black ${
                            isSelected
                              ? "bg-bus text-bus-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {s.order}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-extrabold">
                            {s.stopName}
                          </p>
                          <p className="text-muted-foreground mt-[2px] text-[11px] font-bold">
                            {s.scheduledAt}
                            {s.isTerminal
                              ? ` · ${
                                  selected.direction === "PICKUP"
                                    ? "도착지 (하차 불가)"
                                    : "출발지 (승차 불가)"
                                }`
                              : isCurrent
                                ? " · 현재 사용 중"
                                : s.order === 1
                                  ? " · 첫 정류장"
                                  : ""}
                          </p>
                        </div>
                        {isSelected ? (
                          <CheckCircle2 className="text-bus-foreground h-[18px] w-[18px] shrink-0" />
                        ) : disabled ? (
                          <span className="bg-muted text-muted-foreground inline-flex items-center rounded-[4px] px-[7px] py-[2px] text-[10px] font-black uppercase tracking-[0.04em] shrink-0">
                            선택 불가
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {fieldErr.toStopId ? (
                <p className="text-destructive mt-1.5 text-xs font-bold">
                  {fieldErr.toStopId[0]}
                </p>
              ) : null}
            </>
          ) : null}

          <SectionTitle>사유 (선택)</SectionTitle>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 500))}
            placeholder="이날만 할머니 댁에서 등원해요"
            className="bg-card border-border focus:border-bus focus:outline-bus min-h-[80px] w-full resize-y rounded-[10px] border px-[13px] py-[12px] text-[14px] font-semibold focus:outline-2"
          />

          {/* refac .summary: bg-info-soft. stop-change에서는 warning 톤(승인 안내) — 우리는 hi-fi의 .summary 그대로 info-soft 유지(refac도 동일) */}
          {selected && toStop && summaryDateLabel ? (
            <div className="bg-info-soft border-info/25 mt-[14px] rounded-[12px] border p-[12px]">
              <h4 className="text-info text-[12px] font-black uppercase tracking-[0.04em]">
                변경 요약
              </h4>
              <p className="mt-1.5 text-[13px] font-bold leading-[1.5]">
                <strong className="font-black">
                  {summaryDateLabel} {DIRECTION_LABEL[selected.direction]}
                </strong>{" "}
                · {selected.fromStopName} →{" "}
                <strong className="font-black">{toStop.stopName}</strong>
              </p>
              <p className="text-warning mt-1 text-[11px] font-extrabold">
                학원장 승인 후 적용됩니다 (보통 30분 이내)
              </p>
            </div>
          ) : null}

          {state.error ? (
            <p className="text-destructive mt-3 text-sm font-bold" role="alert">
              {state.error}
            </p>
          ) : null}
        </div>

        {/* refac .bottom-cta */}
        <div
          className="bg-card border-border sticky bottom-0 left-0 right-0 border-t px-[16px] pt-[12px]"
          style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
        >
          <p className="text-muted-foreground mb-[8px] text-center text-[11px] font-bold">
            학원장 승인 후 기사님께 자동 전달됩니다
          </p>
          <button
            type="submit"
            disabled={pending || !toStopId || !selected}
            className="bg-bus text-bus-foreground h-[48px] w-full rounded-[12px] text-[15px] font-black disabled:opacity-50"
          >
            {pending ? "신청 중..." : "변경 신청"}
          </button>
        </div>
      </form>
    </>
  );
}

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

function OptList({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-[8px]">{children}</div>;
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
