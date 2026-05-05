"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useTripBroadcast } from "@/lib/geo/use-trip-broadcast";
import { MultiTripLiveMap } from "@/lib/map/multi-trip-live-map";
import type { MultiTripDescriptor } from "@/lib/map/multi-trip-live-map-inner";

// W19-C: 학원장 dashboard 상단 멀티 trip 라이브 지도 orchestrator.
//
// 운행 중 trip 목록 받아 각 trip마다 useTripBroadcast 구독 → 모든 ping 모아 지도에
// 마커 N개 표시. Rules of Hooks 위반 없도록 trip별 mini-component(TripPingFeeder)
// 패턴.
//
// 운행 중 0개면 컴포넌트가 null 반환 → DOM 깨끗.

type TripInput = Omit<MultiTripDescriptor, "ping">;

export function MultiTripLiveSection({
  runningTrips,
}: {
  runningTrips: TripInput[];
}) {
  const router = useRouter();

  // tripId → 최신 ping. 각 TripPingFeeder가 onPing으로 setState 호출.
  const [pings, setPings] = useState<
    Record<string, { lat: number; lng: number; heading: number | null }>
  >({});

  const updatePing = useCallback(
    (tripId: string, ping: { lat: number; lng: number; heading: number | null }) => {
      setPings((prev) => ({ ...prev, [tripId]: ping }));
    },
    [],
  );

  if (runningTrips.length === 0) return null;

  const trips: MultiTripDescriptor[] = runningTrips.map((t) => ({
    ...t,
    ping: pings[t.id] ?? null,
  }));

  return (
    <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold tracking-tight">
            운행 중 셔틀 위치
          </h3>
          <span className="bg-bus-soft text-bus inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
            <span className="bg-bus inline-block h-1.5 w-1.5 animate-pulse rounded-full" />
            {runningTrips.length}대 운행
          </span>
        </div>
        <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
          기사 폰 위치 · 약 5초마다 갱신 · 마커 클릭 시 해당 운행 상세
        </p>
      </div>

      {/* trip별 broadcast 구독 (render null) */}
      {runningTrips.map((t) => (
        <TripPingFeeder key={t.id} tripId={t.id} onPing={updatePing} />
      ))}

      <MultiTripLiveMap
        trips={trips}
        onTripClick={(tripId) => router.push(`/dashboard/trip/${tripId}`)}
        height="44vh"
      />
    </section>
  );
}

function TripPingFeeder({
  tripId,
  onPing,
}: {
  tripId: string;
  onPing: (
    tripId: string,
    ping: { lat: number; lng: number; heading: number | null },
  ) => void;
}) {
  const ping = useTripBroadcast(tripId);

  // ping이 들어올 때마다 부모에게 알림. useEffect 안에서 setState 호출이 안전.
  useEffect(() => {
    if (!ping) return;
    onPing(tripId, {
      lat: ping.lat,
      lng: ping.lng,
      heading: ping.heading,
    });
  }, [ping, tripId, onPing]);

  return null;
}
