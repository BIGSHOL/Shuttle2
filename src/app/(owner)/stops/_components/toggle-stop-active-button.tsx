"use client";

import { useState, useTransition } from "react";
import { Power, PowerOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { toggleStopActiveAction } from "../actions";

// W26-E: 정류장 사용/미사용 빠른 토글 (Route ToggleActiveButton 패턴 mirror).
// 분리 이유 — server action import + label("정류장" vs "노선")이 entity별로
// 다르고 한 컴포넌트에 분기 넣는 비용 > 50줄 복제 비용.
export function ToggleStopActiveButton({
  id,
  isActive,
  size = "sm",
  showLabel = true,
}: {
  id: string;
  isActive: boolean;
  size?: "sm" | "default";
  showLabel?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState(isActive);

  function handleToggle() {
    const next = !optimistic;
    setOptimistic(next);
    startTransition(async () => {
      try {
        await toggleStopActiveAction(id, next);
        toast.success(
          next ? "정류장을 사용으로 전환했습니다" : "정류장을 미사용으로 전환했습니다",
        );
      } catch (err) {
        setOptimistic(!next);
        toast.error(err instanceof Error ? err.message : "전환에 실패했습니다");
      }
    });
  }

  const Icon = optimistic ? Power : PowerOff;
  return (
    <Button
      type="button"
      size={size}
      variant="ghost"
      disabled={pending}
      onClick={handleToggle}
      className={
        optimistic
          ? "text-success hover:text-success/80"
          : "text-muted-foreground hover:text-foreground"
      }
      aria-label={optimistic ? "정류장 미사용으로 전환" : "정류장 사용으로 전환"}
    >
      <Icon className="h-3.5 w-3.5" />
      {showLabel ? (
        <span className="ml-1">{optimistic ? "사용중" : "미사용"}</span>
      ) : null}
    </Button>
  );
}
