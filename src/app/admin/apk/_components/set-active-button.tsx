"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
  const [open, setOpen] = useState(false);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("id", id);
        const r = await setActiveReleaseAction(fd);
        if (!r.ok) {
          setError(r.error);
        } else {
          setOpen(false);
        }
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
        onClick={() => setOpen(true)}
      >
        활성으로 설정
      </Button>
      {error ? (
        <p className="text-destructive mt-1 text-xs font-medium">{error}</p>
      ) : null}

      <ConfirmDialog
        open={open}
        onOpenChange={(o) => (o ? null : setOpen(false))}
        title={`버전 ${version} 활성화`}
        description={
          <span>
            기사 앱이 다음 시작 시 강제 업데이트 안내를 받게 됩니다. 기존 활성
            버전은 자동 해제됩니다.
          </span>
        }
        confirmLabel="활성화"
        pending={pending}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
