"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { unlinkGuardianLinkAction } from "../actions";

export function UnlinkGuardianLinkButton({
  linkId,
  guardianName,
  studentName,
}: {
  linkId: string;
  guardianName: string;
  studentName: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="text-destructive hover:bg-destructive/10 h-7 px-2 text-xs"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            `${guardianName}님과 ${studentName}의 연결을 해제할까요? 학부모 계정은 유지되고, 다른 자녀가 있으면 그쪽 연결만 남습니다.`,
          )
        )
          return;
        startTransition(async () => {
          try {
            await unlinkGuardianLinkAction(linkId);
          } catch (e) {
            console.error("unlink failed:", e);
            alert("연결 해제에 실패했어요.");
          }
        });
      }}
    >
      {pending ? "해제 중..." : "해제"}
    </Button>
  );
}
