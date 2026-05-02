"use client";

import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useWakeLock } from "@/lib/wake-lock/use-wake-lock";

import { endTripAction } from "../../run/actions";

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

type StopRow = {
  id: string;
  order: number;
  scheduledAt: string;
  name: string;
};

export function TripRunningView({
  tripId,
  route,
  vehicle,
  stops,
  isKidsMode,
  startedAtISO,
}: {
  tripId: string;
  route: { name: string; direction: "PICKUP" | "DROPOFF" };
  vehicle: { plate: string; mode: "KIDS" | "GENERAL" };
  stops: StopRow[];
  isKidsMode: boolean;
  startedAtISO: string | null;
}) {
  // Wake Lock — 화면 자동 꺼짐 방지
  const wakeLock = useWakeLock(true);

  // 경과 시간 표시
  const [elapsed, setElapsed] = useState("00:00");
  useEffect(() => {
    if (!startedAtISO) return;
    const start = new Date(startedAtISO).getTime();

    const tick = () => {
      const sec = Math.floor((Date.now() - start) / 1000);
      const m = Math.floor(sec / 60)
        .toString()
        .padStart(2, "0");
      const s = (sec % 60).toString().padStart(2, "0");
      setElapsed(`${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAtISO]);

  const [endPending, startEndTransition] = useTransition();
  const [endError, setEndError] = useState<string | null>(null);

  function handleEnd() {
    if (!confirm("운행을 종료할까요? 종료 후에는 GPS 송신이 멈춥니다.")) return;
    setEndError(null);
    startEndTransition(async () => {
      try {
        await endTripAction(tripId);
      } catch (err) {
        setEndError(err instanceof Error ? err.message : "종료 실패");
      }
    });
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      {/* Wake Lock 상태 */}
      {!wakeLock.supported ? (
        <Card className="border-amber-300 bg-amber-50/60">
          <CardHeader className="py-3">
            <CardTitle className="text-sm text-amber-900">
              ⚠️ 화면 자동 꺼짐 방지가 지원되지 않습니다
            </CardTitle>
            <CardDescription className="text-xs">
              iOS Safari는 Wake Lock 미지원. 안드로이드 폰을 거치대에 두고
              화면을 켜둔 채 운행하세요.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {/* 운행 헤드 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">{route.name}</CardTitle>
              <CardDescription className="mt-1 flex flex-wrap gap-2 text-xs">
                <span
                  className={
                    route.direction === "PICKUP"
                      ? "rounded-md bg-emerald-100 px-2 py-0.5 font-medium text-emerald-900"
                      : "rounded-md bg-sky-100 px-2 py-0.5 font-medium text-sky-900"
                  }
                >
                  {DIRECTION_LABEL[route.direction]}
                </span>
                <span className="text-muted-foreground">
                  [{vehicle.mode}] {vehicle.plate}
                </span>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground text-xs">경과</div>
              <div className="font-mono text-2xl font-semibold">{elapsed}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={
                wakeLock.active
                  ? "rounded-md bg-emerald-100 px-2 py-0.5 font-medium text-emerald-900"
                  : "rounded-md bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700"
              }
            >
              화면 잠금 방지: {wakeLock.active ? "ON" : "OFF"}
            </span>
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700">
              GPS: 더미 (W3-3b에서 연결)
            </span>
            {isKidsMode ? (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
                KIDS 모드 · 안전점검 필요
              </span>
            ) : null}
          </div>
          {wakeLock.error ? (
            <p className="text-destructive">{wakeLock.error}</p>
          ) : null}
        </CardContent>
      </Card>

      {/* 정류장 진행도 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">정류장 진행</CardTitle>
          <CardDescription>
            {stops.length}개 정류장. W3-3b에서 GPS 반경 진입 시 자동 진행 표시.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ol className="divide-y">
            {stops.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 px-4 py-3 text-sm"
              >
                <span className="bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs">
                  {s.order}
                </span>
                <span className="flex-1 font-medium">{s.name}</span>
                <span className="text-muted-foreground font-mono text-xs">
                  {s.scheduledAt}
                </span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* 운행 종료 */}
      <Card className="border-rose-200 bg-rose-50/40">
        <CardContent className="pt-6">
          <Button
            type="button"
            variant="destructive"
            size="lg"
            className="w-full"
            disabled={endPending}
            onClick={handleEnd}
          >
            {endPending ? "종료 중..." : "운행 종료"}
          </Button>
          {endError ? (
            <p className="text-destructive mt-2 text-sm" role="alert">
              {endError}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="text-muted-foreground text-xs">
          종료를 누르면 GPS 송신이 멈추고 운행 기록이 마감됩니다.
        </CardFooter>
      </Card>
    </main>
  );
}
