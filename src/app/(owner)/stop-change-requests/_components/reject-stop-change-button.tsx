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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { rejectStopChangeAction } from "../actions";

export function RejectStopChangeButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const r = await rejectStopChangeAction(id, reason);
        if ("error" in r) {
          setError(r.error);
          return;
        }
        setOpen(false);
        setReason("");
      } catch (e) {
        console.error(e);
        setError("처리에 실패했어요.");
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="text-destructive hover:bg-destructive/10"
        onClick={() => setOpen(true)}
      >
        반려
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>정류장 변경 반려</DialogTitle>
            <DialogDescription>
              학부모에게 사유가 함께 전달됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">반려 사유</Label>
            <textarea
              id="reject-reason"
              maxLength={500}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 노선 우회 거리가 길어 다른 위치로 다시 요청해 주세요."
              className="border-input bg-background flex w-full rounded-md border px-3 py-2 text-sm shadow-xs"
            />
            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
          </div>
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
              onClick={submit}
              disabled={pending || reason.trim().length === 0}
            >
              {pending ? "반려 중..." : "반려"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
