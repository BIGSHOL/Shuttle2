"use client";

import Link from "next/link";
import { Bus } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signupAction, type SignupState } from "./actions";

const ORG_TYPE_OPTIONS = [
  { value: "ACADEMY", label: "학원·교습소" },
  { value: "DAYCARE", label: "어린이집" },
  { value: "KINDERGARTEN", label: "유치원" },
] as const;

export function SignupForm() {
  const [state, action, pending] = useActionState<SignupState, FormData>(
    signupAction,
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
          <h2 className="text-2xl font-extrabold tracking-tight">
            학원·기관 가입
          </h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            학원장·원장이 기관을 등록하세요. 학부모는 기관에서 받은 초대
            링크로 가입합니다.
          </p>
        </div>

        <form action={action} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="orgName" className="text-xs font-bold">
              기관명
            </Label>
            <Input
              id="orgName"
              name="orgName"
              placeholder="○○수학학원, ○○어린이집"
              required
              maxLength={100}
            />
            {state.fieldErrors?.orgName ? (
              <p className="text-destructive text-xs font-medium">
                {state.fieldErrors.orgName[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">기관 유형</Label>
            <div className="grid grid-cols-3 gap-2">
              {ORG_TYPE_OPTIONS.map((opt, idx) => (
                <label
                  key={opt.value}
                  className="border-input bg-background hover:bg-muted has-[:checked]:border-bus has-[:checked]:bg-bus-soft has-[:checked]:text-bus-foreground flex cursor-pointer items-center justify-center rounded-xl border p-3 text-xs font-bold transition-colors has-[:checked]:font-extrabold"
                >
                  <input
                    type="radio"
                    name="orgType"
                    value={opt.value}
                    defaultChecked={idx === 0}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

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
            {state.fieldErrors?.email ? (
              <p className="text-destructive text-xs font-medium">
                {state.fieldErrors.email[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-bold">
              비밀번호
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="8자 이상"
              minLength={8}
              required
            />
            {state.fieldErrors?.password ? (
              <p className="text-destructive text-xs font-medium">
                {state.fieldErrors.password[0]}
              </p>
            ) : null}
          </div>

          <label className="border-input bg-background hover:bg-muted/40 has-[:checked]:border-bus has-[:checked]:bg-bus-soft/40 flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-xs transition-colors">
            <input
              type="checkbox"
              name="agreeTerms"
              className="accent-bus mt-0.5 h-4 w-4"
              required
            />
            <span className="font-medium">
              <Link
                href="/terms"
                target="_blank"
                className="text-primary font-bold underline-offset-2 hover:underline"
              >
                이용약관
              </Link>{" "}
              및{" "}
              <Link
                href="/privacy"
                target="_blank"
                className="text-primary font-bold underline-offset-2 hover:underline"
              >
                개인정보처리방침
              </Link>
              에 동의합니다.
            </span>
          </label>

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
            {pending ? "가입 중..." : "기관 등록하고 시작"}
          </Button>
        </form>

        <p className="text-muted-foreground mt-4 text-center text-xs font-medium">
          이미 계정이 있다면{" "}
          <Link
            href="/login"
            className="text-primary font-bold underline-offset-2 hover:underline"
          >
            로그인
          </Link>
        </p>
      </div>

      <div className="bg-card rounded-2xl border p-4 text-center shadow-sm">
        <p className="text-xs font-bold">학부모이신가요?</p>
        <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
          기관에서 받은 초대 링크로 자녀를 연결하세요. 별도 가입 불필요.
        </p>
      </div>
    </div>
  );
}
