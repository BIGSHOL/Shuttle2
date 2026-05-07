"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { setActiveReleaseAction } from "../actions";

export function SetActiveButton({
  id,
  version,
}: {
  id: string;
  version: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (
      !confirm(
        `version ${version}을(를) 활성으로 설정합니다.\n기사 RN 앱이 다음 시작 시 강제 업데이트 prompt를 받습니다.\n계속할까요?`,
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("id", id);
        const r = await setActiveReleaseAction(fd);
        if (!r.ok) setError(r.error);
      } catch (e) {
        console.error(e);
        setError("실패");
      }
    });
  }

  return (
    <div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={handleClick}
      >
        활성으로 설정
      </Button>
      {error ? (
        <p className="text-destructive mt-1 text-xs font-medium">{error}</p>
      ) : null}
    </div>
  );
}
