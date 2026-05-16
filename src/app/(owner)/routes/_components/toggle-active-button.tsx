"use client";

import { useState, useTransition } from "react";
import { Power, PowerOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { toggleRouteActiveAction } from "../actions";

// W26-B: 노선 사용/미사용 빠른 토글 (list page 인라인 버튼).
export function ToggleActiveButton({
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
        await toggleRouteActiveAction(id, next);
        toast.success(next ? "노선을 사용으로 전환했습니다" : "노선을 미사용으로 전환했습니다");
      } catch (err) {
        // rollback
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
      aria-label={optimistic ? "노선 미사용으로 전환" : "노선 사용으로 전환"}
    >
      <Icon className="h-3.5 w-3.5" />
      {showLabel ? <span className="ml-1">{optimistic ? "사용중" : "미사용"}</span> : null}
    </Button>
  );
}
