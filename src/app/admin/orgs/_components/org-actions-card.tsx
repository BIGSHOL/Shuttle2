"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import {
  activateOrgAction,
  startImpersonationAction,
  suspendOrgAction,
  updateOrgPlanAction,
} from "../[id]/actions";

type Props = {
  orgId: string;
  orgName: string;
  status: "ACTIVE" | "SUSPENDED" | "TRIAL_EXPIRED";
  plan: "TRIAL" | "BASIC" | "PRO";
};

const PLANS: Props["plan"][] = ["TRIAL", "BASIC", "PRO"];
const PLAN_LABEL = {
  TRIAL: "체험판",
  BASIC: "기본",
  PRO: "프로",
} as const;

type DialogKind = "plan" | "suspend" | "activate" | "impersonate";

export function OrgActionsCard({ orgId, orgName, status, plan }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // 모달 상태 — 한 번에 1개만 열림.
  const [openDialog, setOpenDialog] = useState<DialogKind | null>(null);
  const [pendingPlan, setPendingPlan] = useState<Props["plan"]>(plan);
  const [suspendReason, setSuspendReason] = useState("");

  function closeDialog() {
    setOpenDialog(null);
  }

  function openPlanDialog(next: Props["plan"]) {
    if (next === plan) return;
    setPendingPlan(next);
    setError(null);
    setOpenDialog("plan");
  }

  function confirmPlanChange() {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("orgId", orgId);
        fd.set("plan", pendingPlan);
        await updateOrgPlanAction(fd);
        closeDialog();
      } catch (e) {
        setError("요금제 변경 실패");
        console.error(e);
      }
    });
  }

  function openSuspendDialog() {
    setSuspendReason("");
    setError(null);
    setOpenDialog("suspend");
  }

  function confirmSuspend() {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("orgId", orgId);
        fd.set("reason", suspendReason);
        await suspendOrgAction(fd);
        closeDialog();
      } catch (e) {
        setError("일시정지 실패");
        console.error(e);
      }
    });
  }

  function openActivateDialog() {
    setError(null);
    setOpenDialog("activate");
  }

  function confirmActivate() {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("orgId", orgId);
        await activateOrgAction(fd);
        closeDialog();
      } catch (e) {
        setError("활성화 실패");
        console.error(e);
      }
    });
  }

  function openImpersonateDialog() {
    setError(null);
    setOpenDialog("impersonate");
  }

  function confirmImpersonate() {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("orgId", orgId);
        await startImpersonationAction(fd);
      } catch (e) {
        // redirect throws NEXT_REDIRECT — 정상 흐름
        if (
          typeof e === "object" &&
          e !== null &&
          "digest" in e &&
          typeof (e as { digest: unknown }).digest === "string" &&
          (e as { digest: string }).digest.startsWith("NEXT_")
        ) {
          throw e;
        }
        setError("임시 진입 실패");
        console.error(e);
      }
    });
  }

  return (
    <div className="bg-card space-y-3 rounded-lg border p-4 shadow-sm">
      <div>
        <p className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
          요금제
        </p>
        <div className="mt-1.5 flex gap-1.5">
          {PLANS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={pending}
              onClick={() => openPlanDialog(p)}
              className={`rounded-md border px-3 py-1.5 text-xs font-extrabold tracking-wide transition-colors disabled:opacity-50 ${
                p === plan
                  ? "border-info bg-info-soft text-info"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40"
              }`}
            >
              {PLAN_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t pt-3">
        <p className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
          운영 상태
        </p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {status === "ACTIVE" ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={openSuspendDialog}
            >
              일시정지
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={openActivateDialog}
            >
              활성화
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={openImpersonateDialog}
          >
            학원장 시점 임시 진입
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-destructive text-xs font-medium" role="alert">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={openDialog === "plan"}
        onOpenChange={(o) => (o ? null : closeDialog())}
        title="요금제 변경"
        description={
          <span>
            <b>{orgName}</b>의 요금제를{" "}
            <b>{PLAN_LABEL[plan]}</b>에서 <b>{PLAN_LABEL[pendingPlan]}</b>로
            변경합니다.
          </span>
        }
        confirmLabel="변경"
        pending={pending}
        onConfirm={confirmPlanChange}
      />

      <ConfirmDialog
        open={openDialog === "suspend"}
        onOpenChange={(o) => (o ? null : closeDialog())}
        title={`${orgName} 일시정지`}
        tone="destructive"
        confirmLabel="일시정지"
        pending={pending}
        onConfirm={confirmSuspend}
        description={
          <div className="space-y-2">
            <p className="text-destructive text-sm font-medium">
              일시정지 시 이 학원의 직원·기사·동승자 모두 로그인이 차단됩니다.
              학부모도 자녀가 이 학원만 등록된 경우 로그인이 차단됩니다.
            </p>
            <label className="text-foreground block text-xs font-bold">
              정지 사유 (선택)
            </label>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={2}
              placeholder="예: 결제 미납, 베타 종료 등"
              className="bg-card border-input mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        }
      />

      <ConfirmDialog
        open={openDialog === "activate"}
        onOpenChange={(o) => (o ? null : closeDialog())}
        title={`${orgName} 활성화`}
        description="다시 활성화하면 직원·기사·동승자가 즉시 로그인할 수 있습니다."
        confirmLabel="활성화"
        pending={pending}
        onConfirm={confirmActivate}
      />

      <ConfirmDialog
        open={openDialog === "impersonate"}
        onOpenChange={(o) => (o ? null : closeDialog())}
        title="학원장 시점 임시 진입"
        description={
          <span>
            <b>{orgName}</b> 학원장 시점으로 임시 진입합니다. 작업 후 반드시
            상단의 <b>‘임시 진입 종료’</b>를 누르세요. 작업 이력은 자동 기록
            됩니다.
          </span>
        }
        confirmLabel="진입"
        pending={pending}
        onConfirm={confirmImpersonate}
      />
    </div>
  );
}
