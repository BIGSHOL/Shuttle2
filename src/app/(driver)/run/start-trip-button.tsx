// W23+: 운행 시작 버튼 — 클릭 시 동승자 picker dialog → "시작" 누르면 startTripAction.
"use client";

import { Play, UserCheck } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { startTripAction } from "./actions";

type Helper = { id: string; name: string };

type Props = {
  routeId: string;
  vehicleId: string;
  vehicleMode: "KIDS" | "GENERAL";
  routeName: string;
  helpers: Helper[];
  disabled?: boolean;
};

export function StartTripButton({
  routeId,
  vehicleId,
  vehicleMode,
  routeName,
  helpers,
  disabled,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const isKids = vehicleMode === "KIDS";
  const [helperId, setHelperId] = useState<string | null>(
    isKids && helpers.length > 0 ? helpers[0].id : null,
  );

  function handleStart() {
    if (isKids && !helperId) {
      setError("어린이용 차량은 동승보호자(동승자)를 반드시 선택해야 합니다");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await startTripAction(routeId, vehicleId, helperId);
        if (result && "error" in result) {
          setError(result.error);
        }
      } catch (err) {
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
  }

  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        size="lg"
        className="bg-bus text-bus-foreground hover:bg-bus/90 border-bus-foreground/10 h-12 w-full border-2 text-base font-black tracking-tight"
        style={{
          boxShadow: "var(--shadow-live, 0 8px 24px rgba(245,197,24,0.25))",
        }}
        disabled={disabled}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <Play className="mr-1.5 h-4 w-4 fill-current" strokeWidth={2.5} />
        운행 시작
      </Button>

      <Dialog open={open} onOpenChange={(v) => !pending && setOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{routeName} 운행 시작</DialogTitle>
            <DialogDescription>
              {isKids
                ? "어린이용 차량은 동승보호자가 반드시 함께 탑승해야 합니다 (도로교통법)."
                : "동승자를 같이 태우는 경우 선택해 주세요."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-foreground flex items-center gap-2 text-[11px] font-black tracking-[0.1em] uppercase">
              <UserCheck className="h-3.5 w-3.5" />
              동승자 선택
            </p>

            {helpers.length === 0 ? (
              <div className="bg-warning-soft text-warning-foreground border-warning/30 rounded-lg border-2 p-3.5 text-xs font-semibold leading-relaxed">
                {isKids
                  ? "동승보호자가 등록되어 있지 않아요. 학원장(원장)께 동승자 등록을 요청해 주세요."
                  : "등록된 동승자가 없어요. 동승자 없이 운행을 시작할 수 있습니다."}
              </div>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {!isKids ? (
                  <label className="hover:bg-muted/40 has-[:checked]:bg-bus-soft has-[:checked]:border-bus flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-colors">
                    <input
                      type="radio"
                      name="helper"
                      checked={helperId === null}
                      onChange={() => setHelperId(null)}
                      className="h-4 w-4"
                    />
                    <span className="text-foreground text-sm font-bold">
                      동승자 없이 운행
                    </span>
                  </label>
                ) : null}
                {helpers.map((h) => (
                  <label
                    key={h.id}
                    className="hover:bg-muted/40 has-[:checked]:bg-bus-soft has-[:checked]:border-bus flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-colors"
                  >
                    <input
                      type="radio"
                      name="helper"
                      checked={helperId === h.id}
                      onChange={() => setHelperId(h.id)}
                      className="h-4 w-4"
                    />
                    <span className="text-foreground text-sm font-extrabold tracking-tight">
                      {h.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error ? (
            <p className="text-destructive text-xs font-medium" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              취소
            </Button>
            <Button
              type="button"
              className="bg-bus text-bus-foreground hover:bg-bus/90 font-extrabold"
              onClick={handleStart}
              disabled={pending || (isKids && !helperId)}
            >
              <Play className="mr-1 h-4 w-4 fill-current" />
              {pending ? "시작 중..." : "운행 시작"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
