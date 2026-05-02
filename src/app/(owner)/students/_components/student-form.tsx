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

import type { StudentFormState } from "../actions";

type ActionFn = (
  prev: StudentFormState,
  formData: FormData,
) => Promise<StudentFormState>;

export type StudentInitial = {
  name: string;
  birthYear: number;
};

const CURRENT_YEAR = new Date().getFullYear();
const EMPTY: StudentInitial = {
  name: "",
  birthYear: CURRENT_YEAR - 7, // 초등 입학 즈음 default
};

export function StudentForm({
  action,
  initial = EMPTY,
  submitLabel = "저장",
  title,
  description,
  termLabel,
  showCard = true,
}: {
  action: ActionFn;
  initial?: StudentInitial;
  submitLabel?: string;
  title: string;
  description?: string;
  termLabel: "학생" | "원아";
  showCard?: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    StudentFormState,
    FormData
  >(action, {});

  const inner = (
    <form action={formAction}>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{termLabel} 이름</Label>
          <Input
            id="name"
            name="name"
            placeholder="예: 김셔틀"
            defaultValue={initial.name}
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
          <Label htmlFor="birthYear">출생연도</Label>
          <Input
            id="birthYear"
            name="birthYear"
            type="number"
            min={CURRENT_YEAR - 20}
            max={CURRENT_YEAR}
            defaultValue={initial.birthYear}
            required
          />
          <p className="text-muted-foreground text-xs">
            만 13세 미만 (=KIDS 모드 대상) 자동 판정에 사용됩니다.
          </p>
          {state.fieldErrors?.birthYear ? (
            <p className="text-destructive text-sm">
              {state.fieldErrors.birthYear[0]}
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
          <a href="/students">취소</a>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중..." : submitLabel}
        </Button>
      </CardFooter>
    </form>
  );

  if (!showCard) return inner;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {inner}
    </Card>
  );
}
