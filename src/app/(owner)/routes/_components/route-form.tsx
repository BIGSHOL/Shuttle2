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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { RouteFormState } from "../actions";
import { WEEKDAYS } from "../_lib/weekdays";

type ActionFn = (
  prev: RouteFormState,
  formData: FormData,
) => Promise<RouteFormState>;

export type VehicleOption = {
  id: string;
  plate: string;
  mode: "KIDS" | "GENERAL";
};

export type RouteInitial = {
  vehicleId: string;
  name: string;
  direction: "PICKUP" | "DROPOFF";
  weekdays: number;
  isActive: boolean;
};

const EMPTY: RouteInitial = {
  vehicleId: "",
  name: "",
  direction: "PICKUP",
  weekdays: 31, // 월~금
  isActive: true,
};

export function RouteForm({
  action,
  vehicles,
  initial = EMPTY,
  submitLabel = "저장",
  title,
  description,
  showBasicCard = true,
}: {
  action: ActionFn;
  vehicles: VehicleOption[];
  initial?: RouteInitial;
  submitLabel?: string;
  title: string;
  description?: string;
  showBasicCard?: boolean;
}) {
  const [state, formAction, pending] = useActionState<RouteFormState, FormData>(
    action,
    {},
  );
  const [weekdays, setWeekdays] = useState(initial.weekdays);

  function toggleDay(bit: number) {
    setWeekdays((w) => (w & bit ? w & ~bit : w | bit));
  }

  const inner = (
    <form action={formAction}>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">노선 이름</Label>
          <Input
            id="name"
            name="name"
            placeholder="예: 월수금 등원 1코스"
            defaultValue={initial.name}
            required
            maxLength={100}
          />
          {state.fieldErrors?.name ? (
            <p className="text-destructive text-sm">
              {state.fieldErrors.name[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="vehicleId">차량</Label>
          {vehicles.length === 0 ? (
            <p className="text-destructive text-sm">
              먼저{" "}
              <Link href="/vehicles" className="font-medium underline">
                차량을 등록
              </Link>
              해야 노선을 만들 수 있습니다.
            </p>
          ) : (
            <Select
              name="vehicleId"
              defaultValue={initial.vehicleId || vehicles[0]?.id}
              required
            >
              <SelectTrigger id="vehicleId">
                <SelectValue placeholder="차량 선택" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    [{v.mode === "KIDS" ? "어린이용" : "일반용"}] {v.plate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {state.fieldErrors?.vehicleId ? (
            <p className="text-destructive text-sm">
              {state.fieldErrors.vehicleId[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>방향</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["PICKUP", "DROPOFF"] as const).map((d) => (
              <label
                key={d}
                className="border-input bg-background hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5 flex cursor-pointer flex-col rounded-md border p-3 text-sm"
              >
                <input
                  type="radio"
                  name="direction"
                  value={d}
                  defaultChecked={initial.direction === d}
                  className="sr-only"
                />
                <span className="font-medium">
                  {d === "PICKUP" ? "등원" : "하원"}
                </span>
                <span className="text-muted-foreground text-xs">
                  {d === "PICKUP" ? "정류장 → 학원·기관" : "학원·기관 → 정류장"}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>운행 요일</Label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => {
              const active = !!(weekdays & d.bit);
              return (
                <button
                  key={d.bit}
                  type="button"
                  onClick={() => toggleDay(d.bit)}
                  className={
                    active
                      ? "bg-primary text-primary-foreground border-primary h-9 w-12 rounded-md border text-sm font-medium"
                      : "bg-background text-foreground hover:bg-accent border-input h-9 w-12 rounded-md border text-sm"
                  }
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          <input type="hidden" name="weekdays" value={weekdays} />
          <p className="text-muted-foreground text-xs">
            여러 요일 선택 가능. 월·수·금 = 1+4+16=21, 평일=31, 매일=127.
          </p>
        </div>

        {/* W26-B: 노선 사용/미사용 토글 */}
        <div className="space-y-2">
          <Label>사용 상태</Label>
          <label className="border-input bg-background hover:bg-accent flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={initial.isActive}
              className="mt-0.5 h-4 w-4"
            />
            <div className="flex-1">
              <div className="font-semibold">노선 사용 중</div>
              <div className="text-muted-foreground text-xs">
                체크 해제하면 미사용 — 오늘 운행 후보·KPI·기사 운행 화면에서 제외됩니다. 학생 배정·정류장 순서는 그대로 유지되어 재활성화 시 즉시 복귀.
              </div>
            </div>
          </label>
        </div>

        {state.error ? (
          <p className="text-destructive text-sm" role="alert">
            {state.error}
          </p>
        ) : null}
      </CardContent>

      <CardFooter className="flex justify-end gap-2">
        <Button asChild type="button" variant="outline">
          <Link href="/routes">취소</Link>
        </Button>
        <Button type="submit" disabled={pending || vehicles.length === 0}>
          {pending ? "저장 중..." : submitLabel}
        </Button>
      </CardFooter>
    </form>
  );

  if (!showBasicCard) {
    return inner;
  }

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
