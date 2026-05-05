"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

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
import { suggestLoginId } from "@/lib/auth/login-id";

import { CopyInviteLink } from "@/app/(owner)/staff/_components/copy-invite-link";

import {
  createGuardianInviteAction,
  type GuardianInviteFormState,
} from "../actions";

const CURRENT_YEAR = new Date().getFullYear();

export function GuardianInviteForm({
  origin,
  students,
  termLabel,
}: {
  origin: string;
  students: { id: string; name: string; birthYear: number }[];
  termLabel: "학생" | "원아";
}) {
  const [state, formAction, pending] = useActionState<
    GuardianInviteFormState,
    FormData
  >(createGuardianInviteAction, {});
  const [loginId, setLoginId] = useState<string>(() => suggestLoginId());

  const inviteUrl = state.newInvite
    ? `${origin}/parent-invite/${state.newInvite.token}`
    : null;

  return (
    <div className="space-y-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>새 보호자 초대</CardTitle>
          <CardDescription>
            한 보호자가 여러 {termLabel}을 가질 수 있습니다. 자녀를 선택하고
            보호자 정보를 입력하면 1회용 초대 링크가 발급됩니다.
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>자녀 선택</Label>
              {students.length === 0 ? (
                <p className="text-destructive text-sm">
                  먼저{" "}
                  <Link href="/students" className="font-medium underline">
                    {termLabel}을 등록
                  </Link>
                  해야 보호자를 초대할 수 있습니다.
                </p>
              ) : (
                <div className="border-input space-y-1 rounded-md border p-2">
                  {students.map((s) => {
                    const age = CURRENT_YEAR - s.birthYear;
                    return (
                      <label
                        key={s.id}
                        className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                      >
                        <input
                          type="checkbox"
                          name="studentIds"
                          value={s.id}
                          className="h-4 w-4"
                        />
                        <span className="flex-1">{s.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {age}세 ({s.birthYear})
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {state.fieldErrors?.studentIds ? (
                <p className="text-destructive text-sm">
                  {state.fieldErrors.studentIds[0]}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="예: 김보호"
                  required
                  maxLength={50}
                />
                {state.fieldErrors?.name ? (
                  <p className="text-destructive text-sm">
                    {state.fieldErrors.name[0]}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">전화번호</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="010-1234-5678"
                  required
                  maxLength={20}
                />
                {state.fieldErrors?.phone ? (
                  <p className="text-destructive text-sm">
                    {state.fieldErrors.phone[0]}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="relation">관계</Label>
                <Input
                  id="relation"
                  name="relation"
                  placeholder="예: 모, 부, 조부"
                  defaultValue="모"
                  required
                  maxLength={20}
                />
                {state.fieldErrors?.relation ? (
                  <p className="text-destructive text-sm">
                    {state.fieldErrors.relation[0]}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label className="invisible">.</Label>
                <label className="border-input bg-background hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                  <input
                    type="checkbox"
                    name="isPrimary"
                    className="h-4 w-4"
                  />
                  <span>주 보호자로 지정</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="loginId">로그인 아이디</Label>
              <div className="flex gap-2">
                <Input
                  id="loginId"
                  name="loginId"
                  value={loginId}
                  onChange={(e) =>
                    setLoginId(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_]/g, "")
                        .slice(0, 20),
                    )
                  }
                  placeholder="kim_parent"
                  required
                  minLength={4}
                  maxLength={20}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLoginId(suggestLoginId())}
                >
                  자동 추천
                </Button>
              </div>
              <p className="text-muted-foreground text-xs font-medium">
                영문 소문자·숫자·_ 4~20자. 보호자가 이 아이디로 로그인합니다.
              </p>
              {state.fieldErrors?.loginId ? (
                <p className="text-destructive text-sm">
                  {state.fieldErrors.loginId[0]}
                </p>
              ) : null}
            </div>

            {state.error ? (
              <p className="text-destructive text-sm" role="alert">
                {state.error}
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button asChild type="button" variant="outline">
              <a href="/guardians">취소</a>
            </Button>
            <Button
              type="submit"
              disabled={pending || students.length === 0}
            >
              {pending ? "발급 중..." : "초대 링크 발급"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {inviteUrl ? (
        <Card className="border-success/30 bg-success-soft/40 w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-success">
              초대 링크가 발급되었습니다
            </CardTitle>
            <CardDescription>
              이 링크를 받은 분에게 SMS·카톡 등으로 직접 전달하세요. 7일 안에
              사용하지 않으면 만료됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CopyInviteLink url={inviteUrl} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
