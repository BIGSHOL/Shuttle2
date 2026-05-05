"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

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

import { rejectAbsenceAction } from "../actions";

export function RejectAbsenceButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const r = await rejectAbsenceAction(id, reason);
        if ("error" in r) {
          setError(r.error);
          return;
        }
        setOpen(false);
        setReason("");
        toast.success("결석 신청을 반려했어요. 학부모에게 사유를 전달했습니다.");
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
            <DialogTitle>결석 신청 반려</DialogTitle>
            <DialogDescription>
              학부모가 사유를 받아볼 수 있도록 반려 사유를 알려 주세요.
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
              placeholder="예: 노선 변경 안내가 늦어 다른 일자로 신청해 주세요."
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
