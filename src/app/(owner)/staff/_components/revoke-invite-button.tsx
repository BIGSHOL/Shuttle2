"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { revokeInviteAction } from "../actions";

export function RevokeInviteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          if (!confirm("이 초대를 취소하시겠습니까?")) return;
          setError(null);
          startTransition(async () => {
            try {
              await revokeInviteAction(id);
            } catch (err) {
              setError(err instanceof Error ? err.message : "취소 실패");
            }
          });
        }}
      >
        {pending ? "..." : "취소"}
      </Button>
      {error ? (
        <span className="text-destructive ml-2 text-xs">{error}</span>
      ) : null}
    </>
  );
}
