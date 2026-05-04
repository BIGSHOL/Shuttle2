"use client";

import Link from "next/link";
import { Bus, Check, MailQuestion } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  requestPasswordResetAction,
  type ForgotState,
} from "./actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState<ForgotState, FormData>(
    requestPasswordResetAction,
    {},
  );

  return (
    <div className="w-full max-w-md space-y-6">
      <Link href="/" className="flex items-center justify-center gap-2">
        <span className="bg-bus text-bus-foreground flex h-9 w-9 items-center justify-center rounded-xl shadow-sm">
          <Bus className="h-5 w-5" />
        </span>
        <span className="text-lg font-extrabold tracking-tight">셔틀이</span>
      </Link>

      {state.ok ? (
        <div className="border-success/30 bg-success-soft/40 rounded-2xl border p-6 text-center shadow-sm">
          <span className="bg-success text-success-foreground mx-auto flex h-12 w-12 items-center justify-center rounded-full">
            <Check className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-xl font-extrabold tracking-tight">
            재설정 메일을 보냈어요
          </h2>
          <p className="text-muted-foreground mt-2 text-sm font-medium leading-relaxed">
            등록된 이메일로 비밀번호 재설정 링크를 보냈습니다. 메일이 안 보이면
            스팸함도 확인해 주세요.
          </p>
          <div className="mt-5">
            <Button asChild variant="outline" size="sm">
              <Link href="/login">로그인 페이지로</Link>
            </Button>
          </div>
        </div>
      ) : state.needsAdminReset ? (
        <div className="border-warning/40 bg-warning-soft/40 rounded-2xl border p-6 text-center shadow-sm">
          <span className="bg-warning text-warning-foreground mx-auto flex h-12 w-12 items-center justify-center rounded-full">
            <MailQuestion className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-xl font-extrabold tracking-tight">
            학원장님께 부탁해 주세요
          </h2>
          <p className="text-muted-foreground mt-2 text-sm font-medium leading-relaxed">
            비밀번호 찾기용 이메일이 등록되어 있지 않아요. 학원장·원장님께
            연락해서 임시 비밀번호를 받아 주세요.
          </p>
          <div className="mt-5">
            <Button asChild variant="outline" size="sm">
              <Link href="/login">로그인 페이지로</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border p-6 shadow-sm">
          <div className="flex items-start gap-2">
            <span className="bg-bus-soft text-bus-foreground mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
              <MailQuestion className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-extrabold tracking-tight">
                비밀번호 찾기
              </h2>
              <p className="text-muted-foreground mt-1 text-sm font-medium">
                이메일이나 로그인 아이디를 입력하면 재설정 메일을 보내드립니다.
              </p>
            </div>
          </div>
          <form action={action} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="identifier" className="text-xs font-bold">
                이메일 또는 로그인 아이디
              </Label>
              <Input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                placeholder="owner@example.com 또는 kim_driver"
                required
              />
              <p className="text-muted-foreground text-[11px] font-medium">
                로그인 아이디로 입력하면 가입 시 등록한 비밀번호 찾기용
                이메일로 메일을 보냅니다.
              </p>
            </div>
            {state.error ? (
              <div
                className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-2.5 text-xs font-medium"
                role="alert"
              >
                {state.error}
              </div>
            ) : null}
            <Button
              type="submit"
              className="w-full text-base font-extrabold"
              size="lg"
              disabled={pending}
            >
              {pending ? "전송 중..." : "재설정 메일 보내기"}
            </Button>
          </form>
          <p className="text-muted-foreground mt-4 text-center text-xs font-medium">
            계정이 기억나셨다면{" "}
            <Link
              href="/login"
              className="text-primary font-bold underline-offset-2 hover:underline"
            >
              로그인
            </Link>
          </p>
        </div>
      )}

      <p className="text-muted-foreground text-center text-[11px] font-medium">
        ©{" "}
        <Link href="/" className="hover:underline">
          셔틀이
        </Link>{" "}
        · 셔틀버스 운영 서비스
      </p>
    </div>
  );
}
