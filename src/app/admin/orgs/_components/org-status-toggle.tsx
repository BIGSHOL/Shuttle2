"use client";

import { useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import { activateOrgAction, suspendOrgAction } from "../[id]/actions";

type Props = {
  orgId: string;
  orgName: string;
  status: "ACTIVE" | "SUSPENDED" | "TRIAL_EXPIRED";
};

// W24: 학원 list에서 행 클릭 진입을 막지 않으면서 inline으로 정지·활성화.
// 학원장 시점 진입은 detail에서만(임시 진입은 신중한 작업이라 inline 미제공).
export function OrgStatusToggle({ orgId, orgName, status }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");

  const isActive = status === "ACTIVE";

  function handleClick(e: React.MouseEvent) {
    // 행 전체가 Link로 감싸진 상태이므로 행 진입을 차단.
    e.preventDefault();
    e.stopPropagation();
    setReason("");
    setOpen(true);
  }

  function handleConfirm() {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("orgId", orgId);
        if (isActive) fd.set("reason", reason);
        if (isActive) {
          await suspendOrgAction(fd);
        } else {
          await activateOrgAction(fd);
        }
        setOpen(false);
      } catch (err) {
        console.error("[org-status-toggle]", err);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={`rounded-md border px-2 py-0.5 text-[11px] font-extrabold tracking-wide transition-colors disabled:opacity-50 ${
          isActive
            ? "border-destructive/30 text-destructive hover:bg-destructive/10"
            : "border-success/30 text-success hover:bg-success-soft"
        }`}
        aria-label={isActive ? "일시정지" : "활성화"}
      >
        {isActive ? "정지" : "활성"}
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={(o) => (o ? null : setOpen(false))}
        title={
          isActive
            ? `${orgName} 일시정지`
            : `${orgName} 활성화`
        }
        tone={isActive ? "destructive" : "default"}
        confirmLabel={isActive ? "일시정지" : "활성화"}
        pending={pending}
        onConfirm={handleConfirm}
        description={
          isActive ? (
            <div className="space-y-2">
              <p className="text-destructive text-sm font-medium">
                일시정지 시 직원·기사·동승자가 즉시 로그인할 수 없게 됩니다.
              </p>
              <label className="text-foreground block text-xs font-bold">
                정지 사유 (선택)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="예: 결제 미납, 베타 종료 등"
                className="bg-card border-input mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          ) : (
            <span>
              다시 활성화하면 직원·기사·동승자가 즉시 로그인할 수 있습니다.
            </span>
          )
        }
      />
    </>
  );
}
