"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { preRegisterAction, type PreRegisterState } from "./actions";

export function PreRegisterForm() {
  const [state, formAction, pending] = useActionState<
    PreRegisterState,
    FormData
  >(preRegisterAction, {});

  if (state.ok) {
    return (
      <Card className="border-success/40 bg-success-soft/40">
        <CardContent className="space-y-2 p-6 text-center">
          <p className="text-success text-lg font-extrabold">
            사전등록이 접수되었어요
          </p>
          <p className="text-success/80 text-sm font-medium">
            기재해주신 연락처로 베타 안내를 드릴게요. 감사합니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <form action={formAction}>
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="orgName">기관명</Label>
              <Input
                id="orgName"
                name="orgName"
                required
                placeholder="○○학원 / ○○어린이집"
              />
              {state.fieldErrors?.orgName ? (
                <p className="text-destructive text-xs">
                  {state.fieldErrors.orgName[0]}
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="orgType">기관 유형</Label>
              <select
                id="orgType"
                name="orgType"
                required
                defaultValue="ACADEMY"
                className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs"
              >
                <option value="ACADEMY">학원·교습소</option>
                <option value="DAYCARE">어린이집</option>
                <option value="KINDERGARTEN">유치원</option>
              </select>
              {state.fieldErrors?.orgType ? (
                <p className="text-destructive text-xs">
                  {state.fieldErrors.orgType[0]}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="contact">담당자 이름</Label>
              <Input id="contact" name="contact" required />
              {state.fieldErrors?.contact ? (
                <p className="text-destructive text-xs">
                  {state.fieldErrors.contact[0]}
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">연락처</Label>
              <Input
                id="phone"
                name="phone"
                required
                placeholder="010-1234-5678"
              />
              {state.fieldErrors?.phone ? (
                <p className="text-destructive text-xs">
                  {state.fieldErrors.phone[0]}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" name="email" type="email" required />
            {state.fieldErrors?.email ? (
              <p className="text-destructive text-xs">
                {state.fieldErrors.email[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="region">지역 (선택)</Label>
            <Input
              id="region"
              name="region"
              placeholder="예: 서울 강남구"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">메모 (선택)</Label>
            <textarea
              id="notes"
              name="notes"
              maxLength={500}
              rows={3}
              placeholder="차량 수, 베타 참여 가능 시기 등 자유 메모"
              className="border-input bg-background flex w-full rounded-md border px-3 py-2 text-sm shadow-xs"
            />
          </div>

          {state.error ? (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "전송 중..." : "사전등록 신청"}
          </Button>
          <p className="text-muted-foreground text-center text-xs">
            제공해주신 정보는 베타 안내 목적으로만 사용되고, 베타 종료 후
            요청 시 즉시 삭제됩니다.
          </p>
        </CardContent>
      </form>
    </Card>
  );
}
