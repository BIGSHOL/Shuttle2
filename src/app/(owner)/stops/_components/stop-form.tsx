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
import { StopMapPicker } from "@/lib/map/stop-map-picker";

import type { StopFormState } from "../actions";

type ActionFn = (
  prev: StopFormState,
  formData: FormData,
) => Promise<StopFormState>;

export type StopInitial = {
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
  address?: string | null;
};

// 강남역 4번 출구 — 시드 데이터의 base와 동일
const DEFAULT_INITIAL: StopInitial = {
  name: "",
  lat: 37.4979,
  lng: 127.0276,
  radiusM: 50,
  address: null,
};

export function StopForm({
  action,
  initial = DEFAULT_INITIAL,
  submitLabel = "저장",
  title,
  description,
}: {
  action: ActionFn;
  initial?: StopInitial;
  submitLabel?: string;
  title: string;
  description?: string;
}) {
  const [state, formAction, pending] = useActionState<StopFormState, FormData>(
    action,
    {},
  );
  const [position, setPosition] = useState({
    lat: initial.lat,
    lng: initial.lng,
  });
  const [radiusM, setRadiusM] = useState(initial.radiusM);
  const [address, setAddress] = useState<string | null>(
    initial.address ?? null,
  );

  return (
    <Card className="w-full max-w-5xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" required>
                  정류장 이름
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="예: ○○아파트 정문"
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

              <input type="hidden" name="lat" value={position.lat} />
              <input type="hidden" name="lng" value={position.lng} />
              <input type="hidden" name="address" value={address ?? ""} />

              <div className="space-y-2">
                <Label htmlFor="radiusM" required>
                  도착 판정 반경 (m)
                </Label>
                <Input
                  id="radiusM"
                  name="radiusM"
                  type="number"
                  min={10}
                  max={500}
                  step={5}
                  value={radiusM}
                  onChange={(e) => setRadiusM(Number(e.target.value) || 50)}
                  required
                />
                <p className="text-muted-foreground text-xs">
                  10~500m. 셔틀 위치가 이 반경 안에 들어오면 정류장 통과로
                  판정합니다.
                </p>
                {state.fieldErrors?.radiusM ? (
                  <p className="text-destructive text-sm">
                    {state.fieldErrors.radiusM[0]}
                  </p>
                ) : null}
              </div>

              <div className="border-t pt-3">
                <p className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
                  현재 위치
                </p>
                <p className="text-foreground mt-1 text-sm font-medium">
                  {address ??
                    "지도에서 위치를 클릭하거나 검색·내 위치 버튼을 사용하세요."}
                </p>
              </div>

              {state.error ? (
                <p className="text-destructive text-sm" role="alert">
                  {state.error}
                </p>
              ) : null}
            </div>

            <StopMapPicker
              position={position}
              radiusM={radiusM}
              onPick={(next) => setPosition(next)}
              onAddressChange={(addr) => setAddress(addr)}
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          <Button asChild type="button" variant="outline">
            <Link href="/stops">취소</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "저장 중..." : submitLabel}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
