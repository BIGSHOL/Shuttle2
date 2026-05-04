"use client";

import { Copy, KeyRound } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

// 학원장이 직원·학부모 비번 초기화 시 사용하는 공통 버튼.
// server action은 호출자에서 bind하거나 클로저로 wrap해서 onReset prop에 전달.
//
// 결과 (임시 비번)는 1회만 표시. DB·서버 로그에 저장 X.
// 학원장이 카톡 등으로 사용자에게 전달, 사용자는 첫 로그인 후 변경 권장.

type ResetResult =
  | { ok: true; tempPassword: string; loginId: string }
  | { error: string };

export function ResetPasswordButton({
  name,
  onReset,
}: {
  name: string;
  onReset: () => Promise<ResetResult>;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ResetResult | null>(null);

  function handleClick() {
    if (
      !confirm(
        `${name}님의 비밀번호를 새 임시 비번으로 바꿉니다. 본인이 다음 로그인 시점부터 새 비번으로 들어옵니다. 계속할까요?`,
      )
    )
      return;

    startTransition(async () => {
      const res = await onReset();
      setResult(res);
    });
  }

  function handleCopy() {
    if (!result || !("ok" in result)) return;
    const text = `[셔틀이] ${name}님 임시 비밀번호\n로그인 아이디: ${result.loginId}\n임시 비밀번호: ${result.tempPassword}\n로그인 후 비밀번호를 바꿔 주세요.`;
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div className="inline-flex flex-col items-end gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={handleClick}
      >
        <KeyRound className="mr-1 h-3.5 w-3.5" />
        {pending ? "초기화 중..." : "비번 초기화"}
      </Button>
      {result && "ok" in result ? (
        <div className="border-success/40 bg-success-soft/40 w-72 space-y-1.5 rounded-md border p-2.5 text-left">
          <p className="text-success text-[11px] font-extrabold tracking-wide uppercase">
            임시 비밀번호 (1회 표시)
          </p>
          <p className="text-foreground font-mono text-xs">
            <span className="text-muted-foreground">아이디</span>{" "}
            <span className="font-bold">{result.loginId}</span>
          </p>
          <p className="text-foreground font-mono text-sm">
            <span className="text-muted-foreground">비번</span>{" "}
            <span className="font-bold">{result.tempPassword}</span>
          </p>
          <Button
            type="button"
            size="sm"
            variant="default"
            className="w-full"
            onClick={handleCopy}
          >
            <Copy className="mr-1 h-3.5 w-3.5" />
            카톡용 메시지 복사
          </Button>
        </div>
      ) : null}
      {result && "error" in result ? (
        <p className="text-destructive text-xs font-medium">{result.error}</p>
      ) : null}
    </div>
  );
}
