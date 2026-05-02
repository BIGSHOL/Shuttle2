"use client";

import { useActionState, useEffect } from "react";

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

import {
  acceptInviteAction,
  type AcceptInviteState,
} from "@/app/(owner)/staff/actions";

const ROLE_LABEL = {
  OWNER: "학원장·원장",
  DRIVER: "기사",
  HELPER: "동승보호자",
} as const;

export function AcceptForm({
  token,
  invite,
}: {
  token: string;
  invite: {
    name: string;
    role: "OWNER" | "DRIVER" | "HELPER";
    org: { name: string };
  };
}) {
  const boundAction = acceptInviteAction.bind(null, token);
  const [state, formAction, pending] = useActionState<
    AcceptInviteState,
    FormData
  >(boundAction, {});

  // 가입 성공 시 곧장 dashboard으로 (W3-3에서 driver/helper 전용 라우트 도입되면 변경)
  useEffect(() => {
    if (state.success) {
      window.location.href = "/dashboard";
    }
  }, [state.success]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>셔틀이 가입</CardTitle>
        <CardDescription>
          <span className="font-medium">{invite.org.name}</span>의{" "}
          <span className="font-medium">{ROLE_LABEL[invite.role]}</span>{" "}
          <span className="font-medium">{invite.name}</span>님으로 가입합니다.
          이메일과 비밀번호만 정해 주세요.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="driver@example.com"
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
        <CardFooter>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "가입 중..." : "가입하고 로그인"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
