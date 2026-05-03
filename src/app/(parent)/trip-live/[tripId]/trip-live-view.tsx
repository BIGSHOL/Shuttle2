"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { estimateEtaMinutes } from "@/lib/geo/eta";
import { useTripBroadcast } from "@/lib/geo/use-trip-broadcast";
import { TripLiveMap } from "@/lib/map/trip-live-map";

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

type Stop = {
  id: string; // RouteStop.id
  stopId: string; // Stop.id (자녀 stopId 매칭용)
  name: string;
  lat: number;
  lng: number;
  order: number;
  scheduledAt: string;
};

export function TripLiveView({
  tripId,
  childStudent,
  route,
  vehicle,
  driverName,
  helperName,
  stops,
  passedStopIds,
  startedAtISO,
}: {
  tripId: string;
  childStudent: { id: string; name: string; stopId: string };
  route: { name: string; direction: "PICKUP" | "DROPOFF" };
  vehicle: { plate: string; mode: "KIDS" | "GENERAL" };
  driverName: string;
  helperName: string | null;
  stops: Stop[];
  passedStopIds: string[];
  startedAtISO: string | null;
}) {
  const ping = useTripBroadcast(tripId);
  const passedSet = useMemo(() => new Set(passedStopIds), [passedStopIds]);

  // 다음 미통과 stop (order 순)
  const nextStop = useMemo(() => {
    return [...stops]
      .sort((a, b) => a.order - b.order)
      .find((s) => !passedSet.has(s.id));
  }, [stops, passedSet]);

  // ETA — 두 단계 중첩:
  // (1) ping 들어올 때마다 직선거리/평균속도로 즉시 계산 (always-on, 빠름)
  // (2) 30초 throttle로 /api/route-eta 호출 → 카카오 길찾기 정밀 ETA로 덮어씀
  //     (카카오 키 없으면 서버 측에서도 직선 폴백 — 동일한 응답 형식)
  const haversineEtaMin = useMemo(() => {
    if (!ping || !nextStop) return null;
    return estimateEtaMinutes(
      { lat: ping.lat, lng: ping.lng },
      { lat: nextStop.lat, lng: nextStop.lng },
    );
  }, [ping, nextStop]);

  const [preciseEta, setPreciseEta] = useState<{
    min: number;
    source: "kakao" | "haversine";
  } | null>(null);
  const lastFetchRef = useRef(0);

  useEffect(() => {
    if (!ping || !nextStop) return;
    const now = Date.now();
    if (now - lastFetchRef.current < 30_000) return; // 30초 throttle
    lastFetchRef.current = now;

    const params = new URLSearchParams({
      fromLat: String(ping.lat),
      fromLng: String(ping.lng),
      toLat: String(nextStop.lat),
      toLng: String(nextStop.lng),
    });
    let cancelled = false;
    fetch(`/api/route-eta?${params}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const min = Number(data.etaMinutes);
        const source = data.source === "kakao" ? "kakao" : "haversine";
        if (Number.isFinite(min)) setPreciseEta({ min, source });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ping, nextStop]);

  // 우선순위: 정밀 ETA(있으면) > 직선 ETA. 다음 stop이 바뀌면 정밀값 무효화.
  // microtask로 lift — react-hooks/set-state-in-effect 회피 (코드베이스 패턴).
  useEffect(() => {
    queueMicrotask(() => setPreciseEta(null));
    lastFetchRef.current = 0;
  }, [nextStop?.id]);

  const etaMin = preciseEta?.min ?? haversineEtaMin;
  const etaSource = preciseEta?.source ?? (haversineEtaMin ? "haversine" : null);

  // 자녀 stop이 통과됐는지
  const childRouteStop = stops.find((s) => s.stopId === childStudent.stopId);
  const childPassed = childRouteStop
    ? passedSet.has(childRouteStop.id)
    : false;

  const mapStops = stops.map((s) => ({
    id: s.id,
    stopId: s.stopId,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    order: s.order,
    isChildStop: s.stopId === childStudent.stopId,
    isPassed: passedSet.has(s.id),
  }));

  return (
    <main className="mx-auto max-w-3xl space-y-3 p-3 sm:p-4">
      {/* 운행 헤더 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                ping ? "animate-pulse bg-emerald-500" : "bg-muted-foreground"
              }`}
            />
            {childStudent.name} · {DIRECTION_LABEL[route.direction]}
          </CardTitle>
          <CardDescription className="space-y-0.5">
            <span>
              {route.name} · {vehicle.plate}
              {vehicle.mode === "KIDS" ? " · 어린이통학버스" : ""}
            </span>
            <span className="text-muted-foreground block text-xs">
              기사 {driverName}
              {helperName ? ` · 동승 ${helperName}` : ""}
              {startedAtISO
                ? ` · 시작 ${new Date(
                    new Date(startedAtISO).getTime() + 9 * 60 * 60 * 1000,
                  )
                    .toISOString()
                    .slice(11, 16)}`
                : ""}
            </span>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 다음 정류장·ETA */}
      <Card
        className={
          childPassed
            ? "border-amber-300 bg-amber-50/60"
            : nextStop
              ? "border-emerald-300 bg-emerald-50/60"
              : ""
        }
      >
        <CardHeader>
          <CardTitle className="text-base">
            {childPassed
              ? `${childStudent.name} 자녀 정류장 통과`
              : nextStop
                ? `다음 정류장: ${nextStop.name}`
                : "모든 정류장 통과"}
          </CardTitle>
          <CardDescription>
            {childPassed
              ? "자녀가 타고 내리는 정류장을 셔틀이 지났습니다."
              : ping && etaMin !== null
                ? `약 ${etaMin}분 후 도착 (${
                    etaSource === "kakao" ? "카카오 길찾기" : "직선거리 추정"
                  })`
                : ping
                  ? "남은 정류장 정보를 계산 중..."
                  : "셔틀 신호를 기다리고 있어요."}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 라이브 지도 */}
      <TripLiveMap
        stops={mapStops}
        shuttle={
          ping
            ? { lat: ping.lat, lng: ping.lng, heading: ping.heading }
            : null
        }
        direction={route.direction}
      />

      {/* 정류장 list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">정류장 순서</CardTitle>
          <CardDescription>
            ★ 표시는 {childStudent.name} 자녀가 타고 내리는 정류장이에요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="divide-y text-sm">
            {[...stops]
              .sort((a, b) => a.order - b.order)
              .map((s) => {
                const isPassed = passedSet.has(s.id);
                const isChild = s.stopId === childStudent.stopId;
                const isNext = nextStop?.id === s.id;
                return (
                  <li
                    key={s.id}
                    className={`flex items-center justify-between gap-3 py-2 ${
                      isPassed ? "text-muted-foreground" : ""
                    } ${isNext ? "font-medium" : ""}`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`inline-block h-5 w-5 rounded-full text-center text-[10px] leading-5 text-white ${
                          isPassed
                            ? "bg-muted-foreground"
                            : isChild
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                      >
                        {s.order + 1}
                      </span>
                      <span>
                        {s.name}
                        {isChild ? " ★" : ""}
                      </span>
                    </span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {isPassed ? "통과" : s.scheduledAt}
                    </span>
                  </li>
                );
              })}
          </ol>
        </CardContent>
      </Card>

      <div className="pt-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/home">홈으로</Link>
        </Button>
      </div>
    </main>
  );
}
