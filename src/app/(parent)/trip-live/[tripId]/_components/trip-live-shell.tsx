"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  helperName,
  stops,
  passedStopIds,
  startedAtISO,
  childEta,
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
  childEta: {
    predictedAtMs: number | null;
    sampleCount: number;
    scheduledAt: string | null;
    passed: boolean;
  } | null;
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

        {childEta && !childEta.passed ? (
          <ChildEtaCard eta={childEta} />
        ) : null}

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

// 자녀 정류장 도착 예상 카드 — 학습된 평균 vs 정시 비교.
function ChildEtaCard({
  eta,
}: {
  eta: {
    predictedAtMs: number | null;
    sampleCount: number;
    scheduledAt: string | null;
    passed: boolean;
  };
}) {
  // sampleCount가 충분(>= 3)하고 predictedAtMs 있으면 학습 평균 표시.
  // 그 외에는 RouteStop.scheduledAt 기반 정시 안내 또는 "데이터 부족".
  if (eta.predictedAtMs !== null) {
    const kst = new Date(eta.predictedAtMs + 9 * 60 * 60 * 1000);
    const hhmm = kst.toISOString().slice(11, 16);

    // 정시(scheduledAt HH:mm) 대비 차이 — scheduledAt이 있으면 비교 표시
    let diffLabel: string | null = null;
    if (eta.scheduledAt) {
      const [sh, sm] = eta.scheduledAt.split(":").map(Number);
      const predHour = kst.getUTCHours();
      const predMin = kst.getUTCMinutes();
      const diffMin =
        predHour * 60 + predMin - ((sh ?? 0) * 60 + (sm ?? 0));
      if (Math.abs(diffMin) >= 1) {
        diffLabel =
          diffMin > 0 ? `정시보다 +${diffMin}분` : `정시보다 ${diffMin}분`;
      } else {
        diffLabel = "정시 도착 예상";
      }
    }

    return (
      <div className="bg-success-soft mt-4 rounded-md border border-success/30 px-3.5 py-3">
        <p className="text-success text-[10px] font-extrabold tracking-wide uppercase">
          자녀 정류장 도착 예상
        </p>
        <p className="text-foreground mt-1 font-mono text-2xl font-extrabold">
          {hhmm}
        </p>
        {diffLabel ? (
          <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
            {diffLabel} · 최근 {eta.sampleCount}건 평균 기반
          </p>
        ) : (
          <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
            최근 {eta.sampleCount}건 운행 평균 기반
          </p>
        )}
      </div>
    );
  }

  // 데이터 부족 → scheduledAt 정시 안내
  if (eta.scheduledAt) {
    return (
      <div className="bg-muted/40 mt-4 rounded-md px-3.5 py-3">
        <p className="text-muted-foreground text-[10px] font-extrabold tracking-wide uppercase">
          자녀 정류장 정시 도착
        </p>
        <p className="text-foreground mt-1 font-mono text-2xl font-extrabold">
          {eta.scheduledAt}
        </p>
        <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
          평균 도착 시각은 운행이 누적되면 표시돼요
        </p>
      </div>
    );
  }

  return null;
}
