"use client";

import Link from "next/link";
import { Bus } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { loginAction, type LoginState } from "./actions";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
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

      <div className="bg-card rounded-2xl border p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">로그인</h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            학원장·기사·동승보호자·학부모 모두 사용하는 계정.
          </p>
        </div>
        <form action={action} className="mt-5 space-y-4">
          {redirectTo ? (
            <input type="hidden" name="redirectTo" value={redirectTo} />
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-bold">
              이메일
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="owner@example.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-bold">
              비밀번호
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
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
            {pending ? "로그인 중..." : "로그인"}
          </Button>
        </form>
        <div className="text-muted-foreground mt-4 flex items-center justify-center gap-3 text-xs font-medium">
          <Link
            href="/forgot-password"
            className="hover:text-foreground hover:underline"
          >
            비밀번호 찾기
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <span>
            계정이 없다면{" "}
            <Link
              href="/signup"
              className="text-primary font-bold underline-offset-2 hover:underline"
            >
              가입하기
            </Link>
          </span>
        </div>
      </div>

      <p className="text-muted-foreground text-center text-[11px] font-medium">
        ©{" "}
        <Link href="/" className="hover:underline">
          셔틀이
        </Link>{" "}
        · 도로교통법 §53⑦ 안전운행기록 자동화
      </p>
    </div>
  );
}
