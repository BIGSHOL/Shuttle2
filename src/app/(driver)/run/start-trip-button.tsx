"use client";

import { Play } from "lucide-react";
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
    <div className="space-y-1.5">
      <Button
        type="button"
        size="lg"
        className="bg-bus text-bus-foreground hover:bg-bus/90 w-full text-base font-extrabold"
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
        <Play className="mr-1 h-4 w-4 fill-current" />
        {pending ? "시작 중..." : "운행 시작"}
      </Button>
      {error ? (
        <p className="text-destructive text-xs font-medium" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
