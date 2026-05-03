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
import { StopMapPicker } from "@/lib/map/stop-map-picker";

import {
  createStopChangeRequestAction,
  type CreateStopChangeState,
} from "../actions";

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

function todayKstDateString(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

type Item = {
  studentId: string;
  studentName: string;
  fromStopId: string;
  fromStopName: string;
  fromStopLat: number;
  fromStopLng: number;
  routeName: string;
  direction: "PICKUP" | "DROPOFF";
};

export function StopChangeForm({ items }: { items: Item[] }) {
  // 선택된 (student, fromStop) — items의 첫 번째 default
  const [selectedKey, setSelectedKey] = useState(
    items[0] ? `${items[0].studentId}|${items[0].fromStopId}` : "",
  );
  const selected = useMemo(
    () =>
      items.find((it) => `${it.studentId}|${it.fromStopId}` === selectedKey),
    [items, selectedKey],
  );

  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(
    selected
      ? { lat: selected.fromStopLat, lng: selected.fromStopLng }
      : null,
  );

  const [state, formAction, pending] = useActionState<
    CreateStopChangeState,
    FormData
  >(createStopChangeRequestAction, {});

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>변경할 정류장이 없어요</CardTitle>
          <CardDescription>
            자녀가 노선에 배정되어야 정류장 변경 요청이 가능합니다. 학원장에게
            노선 배정을 요청해 주세요.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="outline">
            <Link href="/home">홈으로</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>정류장 변경 요청</CardTitle>
        <CardDescription>
          자녀가 타고 내리는 정류장을 옮기고 싶을 때 학원장에게 요청을 보냅니다.
          승인되면 다음 운행부터 변경된 위치로 적용돼요.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="combined">자녀·기존 정류장</Label>
            <select
              id="combined"
              required
              value={selectedKey}
              onChange={(e) => {
                const key = e.target.value;
                setSelectedKey(key);
                const item = items.find(
                  (it) => `${it.studentId}|${it.fromStopId}` === key,
                );
                if (item) {
                  setPos({ lat: item.fromStopLat, lng: item.fromStopLng });
                }
              }}
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs"
            >
              {items.map((it) => (
                <option
                  key={`${it.studentId}|${it.fromStopId}`}
                  value={`${it.studentId}|${it.fromStopId}`}
                >
                  {it.studentName} · {DIRECTION_LABEL[it.direction]}{" "}
                  {it.routeName} · 현재 {it.fromStopName}
                </option>
              ))}
            </select>
            <input
              type="hidden"
              name="studentId"
              value={selected?.studentId ?? ""}
            />
            <input
              type="hidden"
              name="fromStopId"
              value={selected?.fromStopId ?? ""}
            />
            {state.fieldErrors?.studentId ? (
              <p className="text-destructive text-sm">
                {state.fieldErrors.studentId[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>새 정류장 위치</Label>
            <p className="text-muted-foreground text-xs">
              지도를 탭하여 자녀가 내릴 새 위치를 지정해 주세요.
            </p>
            {pos ? (
              <StopMapPicker
                position={pos}
                radiusM={50}
                onPick={(next) => setPos(next)}
              />
            ) : null}
            <input
              type="hidden"
              name="toLat"
              value={pos?.lat?.toString() ?? ""}
            />
            <input
              type="hidden"
              name="toLng"
              value={pos?.lng?.toString() ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="toAddress">주소·메모 (선택)</Label>
            <Input
              id="toAddress"
              name="toAddress"
              maxLength={200}
              placeholder="예: 서울시 ○○구 ○○로 12-3 / 할머니 댁"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="effectiveAt">적용 일자</Label>
            <Input
              id="effectiveAt"
              name="effectiveAt"
              type="date"
              required
              defaultValue={todayKstDateString()}
              min={todayKstDateString()}
            />
            <p className="text-muted-foreground text-xs">
              학원장 승인 후 이 날짜부터 다음 운행에 적용됩니다.
            </p>
            {state.fieldErrors?.effectiveAt ? (
              <p className="text-destructive text-sm">
                {state.fieldErrors.effectiveAt[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">사유 (선택)</Label>
            <textarea
              id="reason"
              name="reason"
              maxLength={500}
              rows={3}
              placeholder="예: 할머니 댁에 들렀다가 함께 등하원해요."
              className="border-input bg-background flex w-full rounded-md border px-3 py-2 text-sm shadow-xs"
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
            <Link href="/my-stop-changes">취소</Link>
          </Button>
          <Button type="submit" disabled={pending || !pos}>
            {pending ? "요청 중..." : "변경 요청 보내기"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
