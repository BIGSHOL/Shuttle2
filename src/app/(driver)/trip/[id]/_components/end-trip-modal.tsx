"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  markBoardingIssueAction,
  toggleBoardingEventAction,
} from "../../../run/actions";

// S1: 운행 종료 누름 → 미처리 학생 있으면 강제 모달.
// 기사가 한 명도 빠짐없이 [탑승했어요] 또는 [안 나옴 보고] 처리해야 종료 가능.
// 학부모·학원장에게 "기사 미보고로 학생이 누락된 상태로 운행 종료" 위험 차단.

export type UnprocessedItem = {
  studentId: string;
  studentName: string;
  stopName: string;
};

export function EndTripModal({
  tripId,
  eventType,
  items,
  onClose,
  onAllResolved,
}: {
  tripId: string;
  eventType: "BOARD" | "ALIGHT";
  items: UnprocessedItem[];
  onClose: () => void;
  onAllResolved: () => void;
}) {
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const [reasonByStudent, setReasonByStudent] = useState<
    Record<string, string>
  >({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remaining = items.filter((i) => !resolved.has(i.studentId));

  // 모두 처리되면 자동으로 운행 종료 호출
  useEffect(() => {
    if (resolved.size > 0 && remaining.length === 0) {
      onAllResolved();
    }
  }, [resolved.size, remaining.length, onAllResolved]);

  async function markBoarded(item: UnprocessedItem) {
    setBusyId(item.studentId);
    setError(null);
    try {
      await toggleBoardingEventAction({
        tripId,
        studentId: item.studentId,
        type: eventType,
      });
      setResolved((prev) => {
        const next = new Set(prev);
        next.add(item.studentId);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리 실패");
    } finally {
      setBusyId(null);
    }
  }

  async function markIssue(item: UnprocessedItem) {
    const reason = (reasonByStudent[item.studentId] ?? "").trim();
    if (reason.length < 1) {
      setError("사유를 입력해 주세요");
      return;
    }
    if (reason.length > 200) {
      setError("사유는 200자 이내로 입력해 주세요");
      return;
    }
    setBusyId(item.studentId);
    setError(null);
    try {
      await markBoardingIssueAction({
        tripId,
        studentId: item.studentId,
        type: eventType === "BOARD" ? "NO_SHOW" : "NO_DROPOFF",
        reason,
      });
      setResolved((prev) => {
        const next = new Set(prev);
        next.add(item.studentId);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "보고 실패");
    } finally {
      setBusyId(null);
    }
  }

  const actionLabel = eventType === "BOARD" ? "탑승" : "하차";
  const issueLabel = eventType === "BOARD" ? "안 나옴" : "안 내림";
  const issueWord = eventType === "BOARD" ? "미탑승" : "미하차";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-card max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl border p-5 shadow-lg sm:rounded-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <span className="bg-warning-soft text-warning mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">
                처리되지 않은 학생 {remaining.length}명
              </h3>
              <p className="text-muted-foreground mt-1 text-xs font-medium leading-relaxed">
                운행을 종료하기 전에 학생별로 {actionLabel} 여부를 표시해
                주세요. 보고하지 않으면 학부모·학원장에게 알릴 수 없어요.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded p-1"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error ? (
          <p
            className="border-destructive/30 bg-destructive/5 text-destructive mt-3 rounded-md border p-2 text-xs font-medium"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <ul className="mt-4 space-y-3">
          {remaining.map((item) => {
            const reason = reasonByStudent[item.studentId] ?? "";
            const isBusy = busyId === item.studentId;
            return (
              <li
                key={item.studentId}
                className="rounded-md border p-3 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold tracking-tight">
                      {item.studentName}
                    </p>
                    <p className="text-muted-foreground truncate text-[11px] font-medium">
                      {item.stopName}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => markBoarded(item)}
                  >
                    {actionLabel}했어요
                  </Button>
                </div>
                <details className="mt-2">
                  <summary className="text-destructive cursor-pointer text-xs font-bold">
                    {issueLabel} 보고
                  </summary>
                  <div className="mt-2 space-y-2">
                    <textarea
                      rows={2}
                      maxLength={200}
                      value={reason}
                      placeholder={`${issueWord} 사유를 입력해 주세요 (최대 200자)`}
                      onChange={(e) =>
                        setReasonByStudent((prev) => ({
                          ...prev,
                          [item.studentId]: e.target.value,
                        }))
                      }
                      className="border-input bg-background w-full rounded-md border p-2 text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={isBusy || reason.trim().length === 0}
                      onClick={() => markIssue(item)}
                    >
                      {issueWord} 보고
                    </Button>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={busyId !== null}
          >
            나중에 (운행 화면 유지)
          </Button>
        </div>
      </div>
    </div>
  );
}
