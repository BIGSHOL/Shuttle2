"use client";

import { useTransition } from "react";
import { toast } from "sonner";

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
            toast.success("결석 신청이 승인됐어요. 학부모에게 알림을 보냈습니다.");
          } catch (e) {
            console.error("ack absence failed:", e);
            toast.error("처리에 실패했어요. 잠시 후 다시 시도해 주세요.");
          }
        });
      }}
    >
      {pending ? "처리 중..." : "확인 완료"}
    </Button>
  );
}
