"use client";

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

import type { VehicleFormState } from "../actions";

type ActionFn = (
  prev: VehicleFormState,
  formData: FormData,
) => Promise<VehicleFormState>;

export type VehicleInitial = {
  plate: string;
  mode: "KIDS" | "GENERAL";
  reportNo: string;
  insuranceUntil: string; // YYYY-MM-DD
};

const EMPTY: VehicleInitial = {
  plate: "",
  mode: "GENERAL",
  reportNo: "",
  insuranceUntil: "",
};

export function VehicleForm({
  action,
  initial = EMPTY,
  submitLabel = "저장",
  title,
  description,
}: {
  action: ActionFn;
  initial?: VehicleInitial;
  submitLabel?: string;
  title: string;
  description?: string;
}) {
  const [state, formAction, pending] = useActionState<
    VehicleFormState,
    FormData
  >(action, {});
  const [mode, setMode] = useState<"KIDS" | "GENERAL">(initial.mode);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plate">차량번호</Label>
            <Input
              id="plate"
              name="plate"
              placeholder="예: 12가 3456"
              defaultValue={initial.plate}
              required
              maxLength={20}
            />
            {state.fieldErrors?.plate ? (
              <p className="text-destructive text-sm">
                {state.fieldErrors.plate[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>운영 모드</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["KIDS", "GENERAL"] as const).map((m) => (
                <label
                  key={m}
                  className="border-input bg-background hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5 flex cursor-pointer flex-col rounded-md border p-3 text-sm"
                >
                  <input
                    type="radio"
                    name="mode"
                    value={m}
                    defaultChecked={initial.mode === m}
                    className="sr-only"
                    onChange={() => setMode(m)}
                  />
                  <span className="font-medium">
                    {m === "KIDS" ? "KIDS" : "GENERAL"}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {m === "KIDS"
                      ? "13세 미만 / 도교법 §52·§53 의무"
                      : "중고생·성인·통근 등"}
                  </span>
                </label>
              ))}
            </div>
            {state.fieldErrors?.mode ? (
              <p className="text-destructive text-sm">
                {state.fieldErrors.mode[0]}
              </p>
            ) : null}
          </div>

          {mode === "KIDS" ? (
            <div className="space-y-4 rounded-md border border-amber-200 bg-amber-50/50 p-4">
              <p className="text-sm font-medium text-amber-900">
                KIDS 모드 — 어린이통학버스 의무 정보
              </p>
              <div className="space-y-2">
                <Label htmlFor="reportNo">신고증명서 번호</Label>
                <Input
                  id="reportNo"
                  name="reportNo"
                  placeholder="관할 경찰서 발급"
                  defaultValue={initial.reportNo}
                  maxLength={50}
                />
                {state.fieldErrors?.reportNo ? (
                  <p className="text-destructive text-sm">
                    {state.fieldErrors.reportNo[0]}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="insuranceUntil">보험 만료일</Label>
                <Input
                  id="insuranceUntil"
                  name="insuranceUntil"
                  type="date"
                  defaultValue={initial.insuranceUntil}
                />
                {state.fieldErrors?.insuranceUntil ? (
                  <p className="text-destructive text-sm">
                    {state.fieldErrors.insuranceUntil[0]}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            // GENERAL 모드면 hidden input으로 빈 값 전달 (KIDS 토글 후 reset 방지)
            <>
              <input type="hidden" name="reportNo" value="" />
              <input type="hidden" name="insuranceUntil" value="" />
            </>
          )}

          {state.error ? (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          ) : null}
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          <Button asChild type="button" variant="outline">
            <a href="/vehicles">취소</a>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "저장 중..." : submitLabel}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
