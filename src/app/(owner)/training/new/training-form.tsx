"use client";

import Link from "next/link";
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
  createTrainingRecordAction,
  type TrainingFormState,
} from "../actions";

const ROLE_LABEL = {
  OWNER: "학원장·원장",
  DRIVER: "기사",
  HELPER: "동승보호자",
} as const;

function todayKstDateString(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function plus2YearsKstDateString(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  kst.setUTCFullYear(kst.getUTCFullYear() + 2);
  // 만료일은 통상 이수일+2년의 12/31 — 직접 수정 가능
  return kst.toISOString().slice(0, 10);
}

export function TrainingForm({
  staffs,
}: {
  staffs: { id: string; name: string; role: "OWNER" | "DRIVER" | "HELPER" }[];
}) {
  const [state, formAction, pending] = useActionState<
    TrainingFormState,
    FormData
  >(createTrainingRecordAction, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>안전교육 기록 추가</CardTitle>
        <CardDescription>
          이수증을 받은 직원 기록을 추가합니다. 만료일은 보통 이수일 +
          2년이지만 강의 안내문에 적힌 날짜로 직접 입력하세요.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staffId">직원</Label>
            <select
              id="staffId"
              name="staffId"
              required
              defaultValue={staffs[0]?.id ?? ""}
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs"
            >
              {staffs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({ROLE_LABEL[s.role]})
                </option>
              ))}
            </select>
            {state.fieldErrors?.staffId ? (
              <p className="text-destructive text-sm">
                {state.fieldErrors.staffId[0]}
              </p>
            ) : null}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">교육 구분</legend>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="category" value="OPERATOR" />
                운영자
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="category"
                  value="DRIVER"
                  defaultChecked
                />
                기사
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="category" value="HELPER" />
                동승보호자
              </label>
            </div>
            {state.fieldErrors?.category ? (
              <p className="text-destructive text-sm">
                {state.fieldErrors.category[0]}
              </p>
            ) : null}
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="completedOn">이수일</Label>
            <Input
              id="completedOn"
              name="completedOn"
              type="date"
              defaultValue={todayKstDateString()}
              required
            />
            {state.fieldErrors?.completedOn ? (
              <p className="text-destructive text-sm">
                {state.fieldErrors.completedOn[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresOn">만료일 (다음 이수 기한)</Label>
            <Input
              id="expiresOn"
              name="expiresOn"
              type="date"
              defaultValue={plus2YearsKstDateString()}
              required
            />
            {state.fieldErrors?.expiresOn ? (
              <p className="text-destructive text-sm">
                {state.fieldErrors.expiresOn[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="certificateUrl">이수증 URL (선택)</Label>
            <Input
              id="certificateUrl"
              name="certificateUrl"
              type="url"
              placeholder="https://..."
            />
            {state.fieldErrors?.certificateUrl ? (
              <p className="text-destructive text-sm">
                {state.fieldErrors.certificateUrl[0]}
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
            <Link href="/training">취소</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "추가 중..." : "추가"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
