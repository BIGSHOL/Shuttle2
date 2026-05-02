"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { deleteStaffAction } from "../actions";

export function DeleteStaffButton({
  id,
  name,
  roleLabel,
}: {
  id: string;
  name: string;
  roleLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          삭제
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{roleLabel} 삭제</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{name}</span> {roleLabel}을(를)
            기관에서 제거합니다. 운행 기록·교육 이수 이력이 있으면 삭제가
            거절됩니다. 본인 계정 또는 OWNER는 삭제할 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <DialogFooter>
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
            variant="destructive"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                try {
                  await deleteStaffAction(id);
                  setOpen(false);
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "삭제에 실패했습니다",
                  );
                }
              });
            }}
          >
            {pending ? "삭제 중..." : "삭제"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
