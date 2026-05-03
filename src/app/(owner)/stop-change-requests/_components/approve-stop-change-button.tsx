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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { approveStopChangeAction } from "../actions";

export function ApproveStopChangeButton({
  id,
  suggestedName,
}: {
  id: string;
  suggestedName: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(suggestedName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const r = await approveStopChangeAction(id, name);
        if ("error" in r) {
          setError(r.error);
          return;
        }
        setOpen(false);
      } catch (e) {
        console.error(e);
        setError("처리에 실패했어요.");
      }
    });
  }

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        승인
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>정류장 변경 승인</DialogTitle>
            <DialogDescription>
              새 정류장을 만들고 자녀의 RouteStudent 정류장을 즉시 갱신합니다.
              이름은 운영자·기사가 알아보기 쉽게 짧게 적어 주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="newStopName">새 정류장 이름</Label>
            <Input
              id="newStopName"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 김민준 할머니 댁"
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
              onClick={submit}
              disabled={pending || name.trim().length === 0}
            >
              {pending ? "승인 중..." : "승인"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
