"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useTripBroadcast } from "@/lib/geo/use-trip-broadcast";
import { MultiTripLiveMap } from "@/lib/map/multi-trip-live-map";
import type { MultiTripDescriptor } from "@/lib/map/multi-trip-live-map-inner";

// W24: 매니저 — 전체 학원의 운행 중 차량을 한 지도에 모아 보는 컴포넌트.
// 학원장 dashboard의 MultiTripLiveSection을 그대로 차용. 마커 클릭 시 해당
// 학원 상세 페이지로 이동.

type TripInput = Omit<MultiTripDescriptor, "ping"> & { orgId: string };

export function AdminMultiTripLive({
  runningTrips,
}: {
  runningTrips: TripInput[];
}) {
  const router = useRouter();
  const [pings, setPings] = useState<
    Record<string, { lat: number; lng: number; heading: number | null }>
  >({});

  const updatePing = useCallback(
    (
      tripId: string,
      ping: { lat: number; lng: number; heading: number | null },
    ) => {
      setPings((prev) => ({ ...prev, [tripId]: ping }));
    },
    [],
  );

  if (runningTrips.length === 0) {
    return (
      <div className="bg-muted/30 text-muted-foreground rounded-lg border p-6 text-center text-sm">
        지금 운행 중인 차량이 없습니다.
      </div>
    );
  }

  const trips: MultiTripDescriptor[] = runningTrips.map((t) => ({
    ...t,
    ping: pings[t.id] ?? null,
  }));

  return (
    <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold tracking-tight">
            운행 중 셔틀 위치 (전체 학원)
          </h3>
          <span className="bg-bus-soft text-bus inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
            <span className="bg-bus inline-block h-1.5 w-1.5 animate-pulse rounded-full" />
            {runningTrips.length}대 운행
          </span>
        </div>
        <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
          기사 폰 위치 · 약 5초마다 갱신 · 마커 클릭 시 해당 학원 상세로 이동
        </p>
      </div>

      {runningTrips.map((t) => (
        <TripPingFeeder key={t.id} tripId={t.id} onPing={updatePing} />
      ))}

      <MultiTripLiveMap
        trips={trips}
        onTripClick={(tripId) => {
          const trip = runningTrips.find((t) => t.id === tripId);
          if (trip) router.push(`/admin/orgs/${trip.orgId}`);
        }}
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
  useEffect(() => {
    if (!ping) return;
    onPing(tripId, { lat: ping.lat, lng: ping.lng, heading: ping.heading });
  }, [ping, tripId, onPing]);
  return null;
}
