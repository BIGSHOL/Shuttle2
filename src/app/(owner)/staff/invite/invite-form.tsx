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

import { createInviteAction, type InviteFormState } from "../actions";

import { CopyInviteLink } from "../_components/copy-invite-link";

export function InviteForm({ origin }: { origin: string }) {
  const [state, formAction, pending] = useActionState<
    InviteFormState,
    FormData
  >(createInviteAction, {});

  const inviteUrl = state.newInvite
    ? `${origin}/invite/${state.newInvite.token}`
    : null;

  return (
    <div className="space-y-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>새 직원 초대</CardTitle>
          <CardDescription>
            기사·동승자에게 줄 1회용 초대 링크를 발급합니다. 링크를 받은 사람은
            본인의 이메일·비밀번호를 정해 가입합니다.
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                name="name"
                placeholder="예: 김기사"
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

            <div className="space-y-2">
              <Label>역할</Label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      value: "DRIVER",
                      label: "기사",
                      desc: "운행 시작·종료, GPS, 안전점검",
                    },
                    {
                      value: "HELPER",
                      label: "동승보호자",
                      desc: "KIDS 모드 동승, 탑승·하차 확인",
                    },
                  ] as const
                ).map((r, idx) => (
                  <label
                    key={r.value}
                    className="border-input bg-background hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5 flex cursor-pointer flex-col rounded-md border p-3 text-sm"
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      defaultChecked={idx === 0}
                      className="sr-only"
                    />
                    <span className="font-medium">{r.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {r.desc}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {state.error ? (
              <p className="text-destructive text-sm" role="alert">
                {state.error}
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button asChild type="button" variant="outline">
              <a href="/staff">취소</a>
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "발급 중..." : "초대 링크 발급"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {inviteUrl ? (
        <Card className="w-full max-w-2xl border-emerald-200 bg-emerald-50/40">
          <CardHeader>
            <CardTitle className="text-emerald-900">
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
