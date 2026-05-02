"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { startTripAction } from "./actions";

export function StartTripButton({
  routeId,
  vehicleId,
  disabled,
}: {
  routeId: string;
  vehicleId: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        disabled={pending || disabled}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await startTripAction(routeId, vehicleId);
            } catch (err) {
              setError(err instanceof Error ? err.message : "시작 실패");
            }
          });
        }}
      >
        {pending ? "시작 중..." : "운행 시작"}
      </Button>
      {error ? <span className="text-destructive text-xs">{error}</span> : null}
    </div>
  );
}
