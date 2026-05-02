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

import { deleteStudentAction } from "../actions";

export function DeleteStudentButton({
  id,
  name,
  termLabel,
}: {
  id: string;
  name: string;
  termLabel: "학생" | "원아";
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
          <DialogTitle>{termLabel} 삭제</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{name}</span> {termLabel}을
            삭제합니다. 보호자 연결·노선 배정·운행 기록이 있으면 삭제가
            거절됩니다.
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
                  await deleteStudentAction(id);
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
