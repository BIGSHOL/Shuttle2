"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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

import { deleteVehicleAction } from "../actions";

export function DeleteVehicleButton({
  id,
  plate,
}: {
  id: string;
  plate: string;
}) {
  const router = useRouter();
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
          <DialogTitle>차량 삭제</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{plate}</span> 차량을 삭제합니다. 이
            차량에 묶인 노선·운행 기록이 있으면 삭제가 거절됩니다.
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
                const result = await deleteVehicleAction(id);
                if (result.ok) {
                  setOpen(false);
                  // 차량 detail/edit 페이지에서 클릭한 경우 → 목록으로 이동.
                  // 목록 페이지에서 클릭한 경우엔 revalidatePath로 갱신되므로 push 무해.
                  router.push("/vehicles");
                } else {
                  setError(result.error);
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
