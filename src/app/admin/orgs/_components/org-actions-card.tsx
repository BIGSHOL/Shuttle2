"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

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

export function OrgActionsCard({ orgId, orgName, status, plan }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handlePlanChange(next: Props["plan"]) {
    if (next === plan) return;
    if (
      !confirm(
        `${orgName}의 요금제를 ${PLAN_LABEL[plan]}에서 ${PLAN_LABEL[next]}로 변경할까요?`,
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("orgId", orgId);
        fd.set("plan", next);
        await updateOrgPlanAction(fd);
      } catch (e) {
        setError("요금제 변경 실패");
        console.error(e);
      }
    });
  }

  function handleSuspend() {
    const reason =
      prompt(`${orgName}을(를) 일시정지합니다. 사유 (선택):`) ?? "";
    if (!confirm(`정말 ${orgName}을(를) 일시정지할까요?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("orgId", orgId);
        fd.set("reason", reason);
        await suspendOrgAction(fd);
      } catch (e) {
        setError("일시정지 실패");
        console.error(e);
      }
    });
  }

  function handleActivate() {
    if (!confirm(`${orgName}을(를) 다시 활성화할까요?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("orgId", orgId);
        await activateOrgAction(fd);
      } catch (e) {
        setError("활성화 실패");
        console.error(e);
      }
    });
  }

  function handleImpersonate() {
    if (
      !confirm(
        `${orgName} 학원장 시점으로 임시 진입합니다.\n작업 후 반드시 "임시 진입 종료"를 누르세요.\n계속할까요?`,
      )
    )
      return;
    setError(null);
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
              onClick={() => handlePlanChange(p)}
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
              onClick={handleSuspend}
            >
              일시정지
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={handleActivate}
            >
              활성화
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={handleImpersonate}
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
    </div>
  );
}
