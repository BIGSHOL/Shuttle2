"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { estimateEtaMinutes } from "@/lib/geo/eta";
import { useTripBroadcast } from "@/lib/geo/use-trip-broadcast";
import { TripLiveMap } from "@/lib/map/trip-live-map";

import { BottomSheet } from "./bottom-sheet";
import { EtaHeadline } from "./eta-headline";
import { LiveActions } from "./live-actions";
import { TripHeader } from "./trip-header";
import { TripInfoCard } from "./trip-info-card";

type Stop = {
  id: string;
  stopId: string;
  name: string;
  lat: number;
  lng: number;
  order: number;
  scheduledAt: string;
};

// W24-D Phase 1 trip-live: data/refac/screenshots/parent-app.jpg "02 · /trip-live"
// 풀스크린 shell. parent layout의 sticky header 위에 fixed inset-0 z-50으로 띄움.
// 영역(refac):
//   <TripHeader />          — 뒤로가기·실시간 위치 title·LIVE pill·기사 통화
//   <TripLiveMap />          — 지도 (flex-1)
//   <BottomSheet>           — live-eta 카드 + 2-button 액션 + 운행 정보
//
// W24-D 변경: refac에는 BottomSheet 안의 stop rail timeline이 없음.
// 하단 sheet는 [ETA 큰 카드 + 2-button + 운행 정보] 3개로 단순화 (지도가
// 정류장 진행도를 마커로 표시).
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
  childStopScheduledAt,
  boardedCount,
  totalAssigned,
  distanceKm,
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
  childStopScheduledAt: string | null; // "HH:mm"
  boardedCount: number;
  totalAssigned: number;
  distanceKm: number;
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

  // 자녀 stop까지 남은 정류장 수 — 정렬된 stops에서 자녀 stop의 index부터 nextStop의 index 사이.
  const stopsAhead = useMemo(() => {
    if (!childRouteStop || childPassed) return 0;
    const childIdx = sortedStops.findIndex((s) => s.id === childRouteStop.id);
    if (childIdx < 0) return null;
    if (!nextStop) return childIdx; // 아직 어떤 stop도 통과 안 함
    const nextIdx = sortedStops.findIndex((s) => s.id === nextStop.id);
    if (nextIdx < 0) return null;
    return Math.max(0, childIdx - nextIdx);
  }, [sortedStops, childRouteStop, childPassed, nextStop]);

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

  // 운행 시간(분) — startedAt 이후 경과. 1초마다 갱신해 sheet에 라이브 반영.
  const [elapsedMin, setElapsedMin] = useState<number | null>(() => {
    if (!startedAtISO) return null;
    return Math.max(
      0,
      Math.floor((Date.now() - new Date(startedAtISO).getTime()) / 60_000),
    );
  });
  useEffect(() => {
    if (!startedAtISO) return;
    const startedMs = new Date(startedAtISO).getTime();
    const interval = setInterval(() => {
      setElapsedMin(Math.max(0, Math.floor((Date.now() - startedMs) / 60_000)));
    }, 30_000);
    return () => clearInterval(interval);
  }, [startedAtISO]);

  return (
    <div className="bg-background fixed inset-0 z-50 mx-auto flex max-w-md flex-col">
      <TripHeader
        direction={route.direction}
        routeName={route.name}
        driverPhone={driverPhone}
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

      {/* refac .live-sheet { gap: 12px } — BottomSheet가 flex-col gap-[12px] 처리 */}
      <BottomSheet>
        <EtaHeadline
          childName={childStudent.name}
          childPassed={childPassed}
          etaMin={etaMin}
          etaSource={etaSource}
          hasPing={ping !== null}
          childStopScheduledAt={childStopScheduledAt}
          stopsAhead={stopsAhead}
        />
        <LiveActions driverPhone={driverPhone} />
        <TripInfoCard
          driverName={driverName}
          helperName={helperName}
          vehiclePlate={vehicle.plate}
          vehicleMode={vehicle.mode}
          distanceKm={distanceKm}
          elapsedMinutes={elapsedMin}
          boardedCount={boardedCount}
          totalAssigned={totalAssigned}
        />
        {childEtaSlot}
      </BottomSheet>

      {/* sheet height 보정 placeholder (지도와 sheet 사이 빈 공간 방지) */}
      <div className="h-0" aria-hidden />
    </div>
  );
}
