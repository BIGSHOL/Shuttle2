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
  createAbsenceRequestAction,
  type CreateAbsenceState,
} from "../actions";

function todayKstDateString(): string {
  // YYYY-MM-DD KST 기준 오늘
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export function AbsenceForm({
  students,
}: {
  students: { id: string; name: string; org: { name: string } }[];
}) {
  const [state, formAction, pending] = useActionState<
    CreateAbsenceState,
    FormData
  >(createAbsenceRequestAction, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>결석 신청</CardTitle>
        <CardDescription>
          결석할 자녀와 날짜·구간을 선택해 주세요. 운행 시작 전까지만
          가능합니다.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="studentId">자녀</Label>
            <select
              id="studentId"
              name="studentId"
              required
              defaultValue={students[0]?.id ?? ""}
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.org.name}
                </option>
              ))}
            </select>
            {state.fieldErrors?.studentId ? (
              <p className="text-destructive text-sm">
                {state.fieldErrors.studentId[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">날짜</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={todayKstDateString()}
              min={todayKstDateString()}
              max="2099-12-31"
              required
            />
            {state.fieldErrors?.date ? (
              <p className="text-destructive text-sm">
                {state.fieldErrors.date[0]}
              </p>
            ) : null}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">결석 구간</legend>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="type"
                  value="ABSENT_BOTH"
                  defaultChecked
                />
                등·하원 모두
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="type" value="ABSENT_PICKUP" />
                등원만
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="type" value="ABSENT_DROPOFF" />
                하원만
              </label>
            </div>
            {state.fieldErrors?.type ? (
              <p className="text-destructive text-sm">
                {state.fieldErrors.type[0]}
              </p>
            ) : null}
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="reason">사유 (선택)</Label>
            <Input
              id="reason"
              name="reason"
              maxLength={200}
              placeholder="예: 병원 진료"
            />
          </div>

          {state.error ? (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          ) : null}
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          <Button asChild type="button" variant="outline">
            <Link href="/my-absences">취소</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "신청 중..." : "신청"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
