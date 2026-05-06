"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { estimateEtaMinutes } from "@/lib/geo/eta";
import { useTripBroadcast } from "@/lib/geo/use-trip-broadcast";
import { TripLiveMap } from "@/lib/map/trip-live-map";

import { BottomSheet } from "./bottom-sheet";
import { EtaHeadline } from "./eta-headline";
import { StopRailTimeline } from "./stop-rail-timeline";
import { TripHeader } from "./trip-header";

type Stop = {
  id: string;
  stopId: string;
  name: string;
  lat: number;
  lng: number;
  order: number;
  scheduledAt: string;
};

// 학부모 trip-live 풀스크린 shell. parent layout의 sticky header 위에
// fixed inset-0 z-50으로 띄워 모바일 풀스크린 효과.
// 내부:
//   <TripHeader />          (z-10, 상단)
//   <TripLiveMap height/>    (절대 중앙, 풀스크린)
//   <BottomSheet>          (z-30, 하단 sheet — ETA + rail timeline)
export function TripLiveShell({
  tripId,
  childStudent,
  route,
  vehicle,
  driverName,
  driverPhone,
  helperName,
  stops,
  passedStopIds,
  startedAtISO,
  childEtaSlot,
}: {
  tripId: string;
  childStudent: { id: string; name: string; stopId: string };
  route: { name: string; direction: "PICKUP" | "DROPOFF" };
  vehicle: { plate: string; mode: "KIDS" | "GENERAL" };
  driverName: string;
  driverPhone: string | null;
  helperName: string | null;
  stops: Stop[];
  passedStopIds: string[];
  startedAtISO: string | null;
  // server-side fetch가 들어가는 server component를 Suspense로 감싸 page에서
  // 넘기는 슬롯. trip-live-shell은 client component이므로 자체 fetch 불가.
  childEtaSlot: ReactNode;
}) {
  const ping = useTripBroadcast(tripId);
  const passedSet = useMemo(() => new Set(passedStopIds), [passedStopIds]);

  const sortedStops = useMemo(
    () => [...stops].sort((a, b) => a.order - b.order),
    [stops],
  );
  const nextStop = useMemo(
    () => sortedStops.find((s) => !passedSet.has(s.id)) ?? null,
    [sortedStops, passedSet],
  );

  // ETA — 직선 즉시 + 30초 throttle 카카오 정밀 (W6-2 그대로)
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
    if (now - lastFetchRef.current < 30_000) return;
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

  useEffect(() => {
    queueMicrotask(() => setPreciseEta(null));
    lastFetchRef.current = 0;
  }, [nextStop?.id]);

  const etaMin = preciseEta?.min ?? haversineEtaMin;
  const etaSource =
    preciseEta?.source ?? (haversineEtaMin !== null ? "haversine" : null);

  // 자녀 stop 통과 여부
  const childRouteStop = stops.find((s) => s.stopId === childStudent.stopId);
  const childPassed = childRouteStop
    ? passedSet.has(childRouteStop.id)
    : false;

  // 지도 마커용 변환
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

  // rail timeline용 변환
  const railItems = sortedStops.map((s) => {
    const isPassed = passedSet.has(s.id);
    const isNext = nextStop?.id === s.id;
    return {
      id: s.id,
      order: s.order,
      name: s.name,
      scheduledAt: s.scheduledAt,
      status: isPassed
        ? ("done" as const)
        : isNext
          ? ("next" as const)
          : ("pending" as const),
      isChildStop: s.stopId === childStudent.stopId,
    };
  });

  // 시작 시각 KST HH:mm
  const startedHHmm = startedAtISO
    ? new Date(new Date(startedAtISO).getTime() + 9 * 60 * 60 * 1000)
        .toISOString()
        .slice(11, 16)
    : null;

  return (
    <div className="bg-background fixed inset-0 z-50 mx-auto flex max-w-md flex-col">
      <TripHeader
        childName={childStudent.name}
        direction={route.direction}
        routeName={route.name}
        driverName={driverName}
        isLive={ping !== null}
      />

      {/* 지도 — header 아래 / sheet 위 영역. flex-1로 빈 공간 채움 */}
      <div className="relative flex-1">
        <TripLiveMap
          stops={mapStops}
          shuttle={
            ping
              ? { lat: ping.lat, lng: ping.lng, heading: ping.heading }
              : null
          }
          direction={route.direction}
          height="100%"
          showCaption={false}
          showStopLabels
        />
      </div>

      <BottomSheet>
        <EtaHeadline
          childPassed={childPassed}
          nextStopName={nextStop?.name ?? null}
          etaMin={etaMin}
          etaSource={etaSource}
          hasPing={ping !== null}
        />

        {childEtaSlot}

        <div className="bg-muted/40 mt-4 rounded-md px-3.5 py-2.5">
          <p className="text-muted-foreground text-[10px] font-extrabold tracking-wide uppercase">
            운행 정보
          </p>
          <p className="mt-1 text-xs font-semibold">
            {route.name} · {vehicle.plate}
            {vehicle.mode === "KIDS" ? " · 어린이통학버스" : ""}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
            기사 {driverName}
            {helperName ? ` · 동승 ${helperName}` : ""}
            {startedHHmm ? ` · 시작 ${startedHHmm}` : ""}
          </p>
          {/* W20-C2: 긴급 시 기사 직접 통화 */}
          {driverPhone ? (
            <a
              href={`tel:${driverPhone}`}
              className="bg-success-soft text-success mt-2 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-extrabold tracking-tight transition-opacity hover:opacity-80"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-3"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              기사 {driverPhone}
            </a>
          ) : null}
        </div>

        <div className="mt-5">
          <p className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
            정류장 진행 상황
          </p>
          <div className="mt-3">
            <StopRailTimeline items={railItems} />
          </div>
        </div>
      </BottomSheet>

      {/* sheet height 보정 placeholder (지도와 sheet 사이 빈 공간 방지) */}
      <div className="h-0" aria-hidden />
    </div>
  );
}

