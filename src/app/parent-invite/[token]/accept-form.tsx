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
  acceptGuardianInviteAction,
  type AcceptGuardianInviteState,
} from "@/app/(owner)/guardians/actions";

export function ParentAcceptForm({
  token,
  invite,
}: {
  token: string;
  invite: {
    name: string;
    relation: string;
    org: { name: string };
    students: { name: string }[];
  };
}) {
  const boundAction = acceptGuardianInviteAction.bind(null, token);
  const [state, formAction, pending] = useActionState<
    AcceptGuardianInviteState,
    FormData
  >(boundAction, {});

  const childNames = invite.students.map((s) => s.name).join(", ");

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>셔틀이 학부모 가입</CardTitle>
        <CardDescription>
          <span className="font-medium">{invite.org.name}</span>의{" "}
          <span className="font-medium">{invite.relation}</span>{" "}
          <span className="font-medium">{invite.name}</span>님으로 가입합니다.
          <br />
          자녀: <span className="font-medium">{childNames}</span>
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
              placeholder="parent@example.com"
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

          <label className="border-input bg-background hover:bg-accent flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm">
            <input
              type="checkbox"
              name="consentMinor"
              className="mt-0.5 h-4 w-4"
              required
            />
            <span className="text-xs">
              자녀(미성년자)의 운행 정보·정류장 위치·탑승·하차·안전점검 기록
              열람 및 푸시 알림 수신에 동의합니다.
            </span>
          </label>
          {state.fieldErrors?.consentMinor ? (
            <p className="text-destructive text-sm">
              {state.fieldErrors.consentMinor[0]}
            </p>
          ) : null}

          {state.error ? (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "가입 중..." : "가입하고 자녀 운행 보기"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
