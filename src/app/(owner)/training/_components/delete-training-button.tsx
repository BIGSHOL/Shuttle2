"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { deleteTrainingRecordAction } from "../actions";

export function DeleteTrainingButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="text-destructive hover:bg-destructive/10 h-7 px-2 text-xs"
      disabled={pending}
      onClick={() => {
        if (!confirm("이 안전교육 기록을 삭제할까요?")) return;
        startTransition(async () => {
          try {
            await deleteTrainingRecordAction(id);
            toast.success("기록을 삭제했어요.");
          } catch (e) {
            console.error("delete failed:", e);
            toast.error("삭제에 실패했어요.");
          }
        });
      }}
    >
      {pending ? "삭제 중..." : "삭제"}
    </Button>
  );
}
