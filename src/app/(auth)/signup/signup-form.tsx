"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>셔틀이 가입</CardTitle>
        <CardDescription>
          학원·교습소·어린이집·유치원 셔틀버스 운영을 시작하세요
        </CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">기관명</Label>
            <Input
              id="orgName"
              name="orgName"
              placeholder="○○수학학원, ○○어린이집"
              required
              maxLength={100}
            />
            {state.fieldErrors?.orgName ? (
              <p className="text-destructive text-sm">
                {state.fieldErrors.orgName[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>기관 유형</Label>
            <div className="grid grid-cols-3 gap-2">
              {ORG_TYPE_OPTIONS.map((opt, idx) => (
                <label
                  key={opt.value}
                  className="border-input bg-background hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5 flex cursor-pointer items-center justify-center rounded-md border p-3 text-sm"
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

          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="owner@example.com"
              required
            />
            {state.fieldErrors?.email ? (
              <p className="text-destructive text-sm">
                {state.fieldErrors.email[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
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
              <p className="text-destructive text-sm">
                {state.fieldErrors.password[0]}
              </p>
            ) : null}
          </div>

          {state.error ? (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          ) : null}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "가입 중..." : "가입하기"}
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            이미 계정이 있다면{" "}
            <a href="/login" className="text-primary font-medium underline">
              로그인
            </a>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
