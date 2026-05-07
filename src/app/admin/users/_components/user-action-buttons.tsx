"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import {
  forceSignOutAction,
  sendPasswordResetLinkAction,
  updateRecoveryEmailAction,
} from "../actions";

type Props = {
  kind: "STAFF" | "GUARDIAN";
  id: string;
  name: string;
  recoveryEmail: string | null;
};

type DialogKind = "reset" | "updateEmail" | "forceSignOut";

export function UserActionButtons({ kind, id, name, recoveryEmail }: Props) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    tone: "success" | "destructive";
    text: string;
  } | null>(null);
  const [openDialog, setOpenDialog] = useState<DialogKind | null>(null);
  const [emailDraft, setEmailDraft] = useState(recoveryEmail ?? "");

  function call(
    fn: (formData: FormData) => Promise<
      { ok: true; message?: string } | { ok: false; error: string }
    >,
    extra?: Record<string, string>,
  ) {
    setFeedback(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("kind", kind);
        fd.set("id", id);
        if (extra) {
          for (const [k, v] of Object.entries(extra)) fd.set(k, v);
        }
        const r = await fn(fd);
        if (r.ok) {
          setFeedback({ tone: "success", text: r.message ?? "완료" });
          setOpenDialog(null);
        } else {
          setFeedback({ tone: "destructive", text: r.error });
        }
      } catch (e) {
        console.error("[user-action]", e);
        setFeedback({ tone: "destructive", text: "처리 실패" });
      }
    });
  }

  function openResetDialog() {
    if (!recoveryEmail) {
      setFeedback({
        tone: "destructive",
        text: "복구용 이메일이 없어 메일을 보낼 수 없습니다. 먼저 등록하세요.",
      });
      return;
    }
    setFeedback(null);
    setOpenDialog("reset");
  }

  function openUpdateEmailDialog() {
    setEmailDraft(recoveryEmail ?? "");
    setFeedback(null);
    setOpenDialog("updateEmail");
  }

  function openForceSignOutDialog() {
    setFeedback(null);
    setOpenDialog("forceSignOut");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={openResetDialog}
        >
          비밀번호 재설정 메일 발송
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={openUpdateEmailDialog}
        >
          복구용 이메일 수정
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={openForceSignOutDialog}
        >
          강제 로그아웃
        </Button>
      </div>
      {feedback ? (
        <p
          className={`text-xs font-medium ${
            feedback.tone === "success" ? "text-success" : "text-destructive"
          }`}
          role="alert"
        >
          {feedback.text}
        </p>
      ) : null}

      <ConfirmDialog
        open={openDialog === "reset"}
        onOpenChange={(o) => (o ? null : setOpenDialog(null))}
        title="비밀번호 재설정 메일 발송"
        description={
          <span>
            <b>{name}</b>의 비밀번호 재설정 링크를 <b>{recoveryEmail}</b>(으)로
            보냅니다.
          </span>
        }
        confirmLabel="발송"
        pending={pending}
        onConfirm={() => call(sendPasswordResetLinkAction)}
      />

      <ConfirmDialog
        open={openDialog === "updateEmail"}
        onOpenChange={(o) => (o ? null : setOpenDialog(null))}
        title="복구용 이메일 수정"
        confirmLabel="저장"
        pending={pending}
        onConfirm={() => {
          if (!emailDraft.trim()) {
            setFeedback({
              tone: "destructive",
              text: "이메일을 입력하세요",
            });
            return;
          }
          call(updateRecoveryEmailAction, { recoveryEmail: emailDraft.trim() });
        }}
        description={
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs">
              현재: {recoveryEmail ?? "—"}
            </p>
            <input
              type="email"
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              placeholder="새 복구용 이메일"
              className="bg-card border-input w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <p className="text-warning text-[11px] font-medium">
              인증 계정의 이메일이 함께 변경됩니다. 사용자에게 새 메일 주소로
              로그인하도록 안내하세요.
            </p>
          </div>
        }
      />

      <ConfirmDialog
        open={openDialog === "forceSignOut"}
        onOpenChange={(o) => (o ? null : setOpenDialog(null))}
        title={`${name} 강제 로그아웃`}
        tone="destructive"
        confirmLabel="강제 로그아웃"
        pending={pending}
        onConfirm={() => call(forceSignOutAction)}
        description={
          <span>
            다음 토큰 갱신 시점(최대 1시간 이내)에 모든 디바이스에서 로그아웃
            됩니다. 사용자에게 다시 로그인하도록 안내하세요.
          </span>
        }
      />
    </div>
  );
}
