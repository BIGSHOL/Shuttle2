"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

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

export function UserActionButtons({ kind, id, name, recoveryEmail }: Props) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    tone: "success" | "destructive";
    text: string;
  } | null>(null);

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
        } else {
          setFeedback({ tone: "destructive", text: r.error });
        }
      } catch (e) {
        console.error("[user-action]", e);
        setFeedback({ tone: "destructive", text: "처리 실패" });
      }
    });
  }

  function handleResetMail() {
    if (!recoveryEmail) {
      setFeedback({
        tone: "destructive",
        text: "recoveryEmail이 없어 메일 발송 불가. 먼저 등록하세요.",
      });
      return;
    }
    if (
      !confirm(
        `${name}의 비밀번호 reset 메일을 ${recoveryEmail}로 발송합니다. 계속할까요?`,
      )
    )
      return;
    call(sendPasswordResetLinkAction);
  }

  function handleUpdateEmail() {
    const next = prompt(
      `새 recoveryEmail (현재: ${recoveryEmail ?? "—"})`,
      recoveryEmail ?? "",
    );
    if (!next) return;
    call(updateRecoveryEmailAction, { recoveryEmail: next });
  }

  function handleForceSignOut() {
    if (
      !confirm(
        `${name}을(를) 강제 로그아웃합니다.\n다음 토큰 갱신 시점(최대 1시간)에 적용됩니다.\n계속할까요?`,
      )
    )
      return;
    call(forceSignOutAction);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={handleResetMail}
        >
          비밀번호 reset 메일 발송
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={handleUpdateEmail}
        >
          recoveryEmail 수정
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={handleForceSignOut}
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
    </div>
  );
}
