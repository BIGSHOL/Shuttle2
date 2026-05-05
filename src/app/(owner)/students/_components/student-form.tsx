"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

// 학제·학년 → 만나이 offset 매핑.
// 출생연도 = CURRENT_YEAR - offset.
// 어린이용 모드 대상(만 13세 미만) = offset ≤ 12.
type GradeOption = { value: string; label: string; offset: number };
const GRADE_OPTIONS: GradeOption[] = [
  { value: "PRE_3", label: "미취학 만 3세", offset: 2 },
  { value: "PRE_4", label: "미취학 만 4세", offset: 3 },
  { value: "PRE_5", label: "미취학 만 5세", offset: 4 },
  { value: "PRE_6", label: "미취학 만 6세", offset: 5 },
  { value: "PRE_7", label: "미취학 만 7세", offset: 6 },
  { value: "ELEM_1", label: "초등학교 1학년", offset: 7 },
  { value: "ELEM_2", label: "초등학교 2학년", offset: 8 },
  { value: "ELEM_3", label: "초등학교 3학년", offset: 9 },
  { value: "ELEM_4", label: "초등학교 4학년", offset: 10 },
  { value: "ELEM_5", label: "초등학교 5학년", offset: 11 },
  { value: "ELEM_6", label: "초등학교 6학년", offset: 12 },
  { value: "MID_1", label: "중학교 1학년", offset: 13 },
  { value: "MID_2", label: "중학교 2학년", offset: 14 },
  { value: "MID_3", label: "중학교 3학년", offset: 15 },
  { value: "HIGH_1", label: "고등학교 1학년", offset: 16 },
  { value: "HIGH_2", label: "고등학교 2학년", offset: 17 },
  { value: "HIGH_3", label: "고등학교 3학년", offset: 18 },
  { value: "ADULT", label: "대학생·성인", offset: 20 },
];

const CUSTOM = "CUSTOM";

function gradeFromBirthYear(birthYear: number): string {
  const offset = CURRENT_YEAR - birthYear;
  const match = GRADE_OPTIONS.find((g) => g.offset === offset);
  return match ? match.value : CUSTOM;
}

const EMPTY: StudentInitial = {
  name: "",
  birthYear: CURRENT_YEAR - 7, // 초등 1학년 default
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

  const initialGrade = useMemo(
    () => gradeFromBirthYear(initial.birthYear),
    [initial.birthYear],
  );
  const [grade, setGrade] = useState(initialGrade);
  const [customYear, setCustomYear] = useState(initial.birthYear);

  const computedBirthYear =
    grade === CUSTOM
      ? customYear
      : CURRENT_YEAR -
        (GRADE_OPTIONS.find((g) => g.value === grade)?.offset ?? 7);
  const isKidsTarget = CURRENT_YEAR - computedBirthYear < 13;

  const inner = (
    <form action={formAction}>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" required>
            {termLabel} 이름
          </Label>
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
          <Label htmlFor="grade" required>
            학제·학년
          </Label>
          <Select value={grade} onValueChange={setGrade}>
            <SelectTrigger id="grade">
              <SelectValue placeholder="학제·학년 선택" />
            </SelectTrigger>
            <SelectContent>
              {GRADE_OPTIONS.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
              <SelectItem value={CUSTOM}>직접 입력</SelectItem>
            </SelectContent>
          </Select>
          {grade === CUSTOM ? (
            <div className="pt-1">
              <Label htmlFor="birthYear" className="text-xs">
                출생연도
              </Label>
              <Input
                id="birthYear"
                type="number"
                min={CURRENT_YEAR - 30}
                max={CURRENT_YEAR}
                value={customYear}
                onChange={(e) => setCustomYear(Number(e.target.value))}
                required
                className="mt-1"
              />
            </div>
          ) : null}
          <p className="text-muted-foreground text-xs">
            {grade === CUSTOM
              ? "만 13세 미만이면 어린이용 모드 대상으로 자동 분류됩니다."
              : `→ ${computedBirthYear}년생 자동 산출${
                  isKidsTarget ? " · 어린이용 모드 대상" : ""
                }`}
          </p>
          <input type="hidden" name="birthYear" value={computedBirthYear} />
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
          <Link href="/students">취소</Link>
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
