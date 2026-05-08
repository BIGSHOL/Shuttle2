"use client";

import { CheckCircle2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { FormBackHeader } from "@/components/shuttlee/form-back-header";

import {
  createStopChangeRequestAction,
  type CreateStopChangeState,
} from "../actions";

// W24-D Phase 1: data/refac/screenshots/parent-app.jpg "04 · /stop-change/new"
// 풀세트 reproduce. refac 영역 순서:
//   form-back ("정류장 변경 신청")
//   - 아이 · 방향 (opt-list radio)
//   - 변경 유형 (chip-row 이번 한 번만 / 기간 지정 / 영구 변경)
//   - 날짜 (date input)
//   - 현재 정류장 (stop-pick.cur — info color)
//   - 변경할 정류장 — A노선 정류장 중 선택 (stop-list)
//   - 사유 (textarea)
//   - summary (변경 요약 card, warning tone)
//   bottom-cta (meta + bus CTA)
//
// 변경 유형 "기간 지정"·"영구 변경"은 schema endDate·permanent 미지원 → 베타 backlog.
// 이번 turn은 "이번 한 번만"만 functional, 나머진 disabled.

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;
const DIRECTION_DETAIL = {
  PICKUP: "집 → 학원·기관",
  DROPOFF: "학원·기관 → 집",
} as const;

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function todayKstDateString(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

type AllStop = {
  stopId: string;
  stopName: string;
  stopAddress: string | null;
  scheduledAt: string; // "HH:mm"
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

  // routeStudentId를 key로 사용 — 같은 student×fromStop이 여러 route에 묶이면
  // studentId__fromStopId는 collide. RouteStudent는 (studentId, routeId) unique.
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

      <form
        action={formAction}
        className="flex min-h-[calc(100dvh-3rem)] flex-col"
      >
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

        <div className="flex-1 px-4 pt-2 pb-28">
          {/* 아이 · 방향 */}
          <SectionTitle>아이 · 방향</SectionTitle>
          <div className="space-y-2">
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
                  <p className="text-sm font-black tracking-tight">
                    {i.studentName} · {DIRECTION_LABEL[i.direction]}{" "}
                    <span className="text-muted-foreground font-bold">
                      ({DIRECTION_DETAIL[i.direction]})
                    </span>
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-[11px] font-bold">
                    {i.routeName}
                    {i.driverName ? ` · ${i.driverName} 기사님` : ""}
                  </p>
                </OptCard>
              );
            })}
          </div>

          {/* 변경 유형 */}
          <SectionTitle>변경 유형</SectionTitle>
          <div className="mb-3 flex flex-wrap gap-1.5">
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

          {/* 날짜 */}
          <div className="space-y-1.5 mb-2">
            <label
              htmlFor="effectiveAtUI"
              className="text-xs font-extrabold"
            >
              날짜
            </label>
            <input
              id="effectiveAtUI"
              type="date"
              value={effectiveAt}
              onChange={(e) => setEffectiveAt(e.target.value)}
              min={todayKstDateString()}
              className="bg-card h-11 w-full rounded-md border px-3 text-sm font-medium focus:outline-2 focus:outline-bus"
              required
            />
          </div>

          {/* 현재 정류장 */}
          {selected ? (
            <>
              <SectionTitle>현재 정류장</SectionTitle>
              <div className="border-info bg-info-soft flex items-center gap-3 rounded-md border-[1.5px] p-3">
                <span className="bg-info text-info-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black">
                  {selected.fromStopOrder ?? "·"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black tracking-tight">
                    {selected.fromStopName}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-[11px] font-bold">
                    평소 사용 정류장
                  </p>
                </div>
                <CheckCircle2
                  className="text-info h-4 w-4 shrink-0"
                  aria-hidden
                />
              </div>
            </>
          ) : null}

          {/* 변경할 정류장 */}
          {selected ? (
            <>
              <p className="text-muted-foreground mt-4 mb-2 text-[11px] font-black tracking-[0.06em] uppercase">
                변경할 정류장{" "}
                <span className="text-muted-foreground/80 font-bold normal-case tracking-normal">
                  · {selected.routeName} 정류장 중 선택
                </span>
              </p>
              <ul className="space-y-1.5">
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
                        className={`flex w-full items-center gap-3 rounded-md border-[1.5px] p-3 text-left transition-colors ${
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
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                            isSelected
                              ? "bg-bus text-bus-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {s.order}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-black tracking-tight">
                            {s.stopName}
                          </p>
                          <p className="text-muted-foreground mt-0.5 text-[11px] font-bold">
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
                          <CheckCircle2 className="text-bus-foreground h-4 w-4 shrink-0" />
                        ) : disabled ? (
                          <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[9px] font-extrabold tracking-tight shrink-0">
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

          {/* 사유 (선택) */}
          <SectionTitle>사유 (선택)</SectionTitle>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 500))}
            placeholder="이날만 할머니 댁에서 등원해요"
            className="bg-card w-full rounded-md border px-3 py-2.5 text-sm font-medium focus:outline-2 focus:outline-bus"
            rows={3}
          />

          {/* summary */}
          {selected && toStop && summaryDateLabel ? (
            <div className="bg-warning-soft border-warning/30 mt-4 rounded-md border p-3">
              <p className="text-warning text-[11px] font-black tracking-[0.04em] uppercase">
                변경 요약
              </p>
              <p className="mt-1.5 text-[13px] font-bold leading-relaxed">
                <span className="font-black">
                  {summaryDateLabel}{" "}
                  {DIRECTION_LABEL[selected.direction]}
                </span>{" "}
                · {selected.fromStopName} →{" "}
                <span className="font-black">{toStop.stopName}</span>
              </p>
              <p className="text-warning mt-1 text-[11px] font-extrabold">
                학원장 승인 후 적용됩니다 (보통 30분 이내)
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

        <div className="bg-card sticky bottom-0 border-t px-4 pt-3 pb-6">
          <p className="text-muted-foreground mb-2 text-center text-[11px] font-bold">
            학원장 승인 후 기사님께 자동 전달됩니다
          </p>
          <button
            type="submit"
            disabled={pending || !toStopId || !selected}
            className="bg-bus text-bus-foreground h-12 w-full rounded-md text-[15px] font-black disabled:opacity-50"
          >
            {pending ? "신청 중..." : "변경 신청"}
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
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
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
