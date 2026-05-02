"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { ackAbsenceAction } from "../actions";

export function AckAbsenceButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            await ackAbsenceAction(id);
          } catch (e) {
            console.error("ack absence failed:", e);
            alert("처리에 실패했어요. 잠시 후 다시 시도해 주세요.");
          }
        });
      }}
    >
      {pending ? "처리 중..." : "확인 완료"}
    </Button>
  );
}
