"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

import { stopImpersonationAction } from "./impersonation-actions";

// W24: 매니저가 학원장 시점으로 임시 진입 중일 때 (owner) 모든 화면 상단에
// 빨간 띠. 종료 버튼 누르면 cookie 삭제 + audit log + /admin/orgs로 redirect.

export function ImpersonationBanner({
  orgName,
  adminEmail,
}: {
  orgName: string;
  adminEmail: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleStop() {
    startTransition(async () => {
      try {
        await stopImpersonationAction();
      } catch (e) {
        // redirect throws NEXT_REDIRECT — 정상
        if (
          typeof e === "object" &&
          e !== null &&
          "digest" in e &&
          typeof (e as { digest: unknown }).digest === "string" &&
          (e as { digest: string }).digest.startsWith("NEXT_")
        ) {
          throw e;
        }
        console.error("[impersonation-banner] failed", e);
      }
    });
  }

  return (
    <div className="bg-destructive text-destructive-foreground sticky top-0 z-50 flex items-center justify-between gap-3 px-4 py-2 text-xs font-bold">
      <span className="truncate">
        ⚠️ 임시 진입 중 — {orgName} (매니저: {adminEmail})
      </span>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={handleStop}
        className="h-7 shrink-0 px-2 text-xs"
      >
        <LogOut className="mr-1 h-3 w-3" />
        {pending ? "종료 중..." : "임시 진입 종료"}
      </Button>
    </div>
  );
}
