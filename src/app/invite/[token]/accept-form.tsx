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
    loginId: string;
    org: { name: string };
  };
}) {
  const boundAction = acceptInviteAction.bind(null, token);
  const [state, formAction, pending] = useActionState<
    AcceptInviteState,
    FormData
  >(boundAction, {});

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>셔틀이 가입</CardTitle>
        <CardDescription>
          <span className="font-medium">{invite.org.name}</span>의{" "}
          <span className="font-medium">{ROLE_LABEL[invite.role]}</span>{" "}
          <span className="font-medium">{invite.name}</span>님으로 가입합니다.
          비밀번호만 정해 주세요.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>로그인 아이디</Label>
            <div className="bg-muted text-foreground rounded-md border px-3 py-2 font-mono text-sm font-bold">
              {invite.loginId}
            </div>
            <p className="text-muted-foreground text-xs font-medium">
              앞으로 로그인할 때 쓰는 아이디입니다. 학원장·원장님이 정하셨어요.
            </p>
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
          <div className="space-y-2">
            <Label htmlFor="recoveryEmail">
              비밀번호 찾기용 이메일{" "}
              <span className="text-muted-foreground text-xs font-medium">
                (선택)
              </span>
            </Label>
            <Input
              id="recoveryEmail"
              name="recoveryEmail"
              type="email"
              autoComplete="email"
              placeholder="example@gmail.com"
            />
            <p className="text-muted-foreground text-xs">
              비밀번호를 잊으면 이 이메일로 다시 만들 수 있어요. 안 적으면
              학원장님께 부탁해야 합니다.
            </p>
            {state.fieldErrors?.recoveryEmail ? (
              <p className="text-destructive text-sm">
                {state.fieldErrors.recoveryEmail[0]}
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
