"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { cancelAbsenceRequestAction } from "../actions";

export function CancelAbsenceButton({ absenceId }: { absenceId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          if (typeof window === "undefined") return;
          if (!window.confirm("결석 신청을 취소하시겠어요?")) return;
          setError(null);
          startTransition(async () => {
            try {
              const result = await cancelAbsenceRequestAction(absenceId);
              if (result && "error" in result) {
                setError(result.error);
              }
            } catch (err) {
              console.error("[cancel-absence-button] failed", err);
              setError("취소에 실패했어요. 잠시 후 다시 시도해 주세요.");
            }
          });
        }}
      >
        {pending ? "..." : "취소"}
      </Button>
      {error ? (
        <span className="text-destructive text-xs">{error}</span>
      ) : null}
    </div>
  );
}
