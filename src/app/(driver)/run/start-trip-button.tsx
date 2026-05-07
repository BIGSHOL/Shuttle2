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
              const result = await startTripAction(routeId, vehicleId);
              if (result && "error" in result) {
                setError(result.error);
              }
            } catch (err) {
              // Next.js redirect/notFound는 internal signal — re-throw해서
              // framework가 navigation 처리하게. catch에서 swallow하면 redirect 안 됨.
              if (
                typeof err === "object" &&
                err !== null &&
                typeof (err as { digest?: unknown }).digest === "string" &&
                (err as { digest: string }).digest.startsWith("NEXT_")
              ) {
                throw err;
              }
              console.error("[start-trip-button] failed", err);
              setError("운행 시작에 실패했어요. 잠시 후 다시 시도해 주세요.");
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
