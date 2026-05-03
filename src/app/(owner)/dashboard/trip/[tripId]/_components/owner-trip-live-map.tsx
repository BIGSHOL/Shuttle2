"use client";

import { useTripBroadcast } from "@/lib/geo/use-trip-broadcast";
import { TripLiveMap } from "@/lib/map/trip-live-map";
import type { TripLiveMapStop } from "@/lib/map/trip-live-map-inner";

// 학원장 trip 상세 화면의 라이브 GPS 지도.
// 기사 폰이 5초 간격으로 trip:<tripId> 채널에 ping을 broadcast — 학부모 trip-live와
// 같은 채널이지만 학원장은 child-stop 강조 없이 모든 정류장을 동등하게 본다.
//
// stops/direction은 server-side에서 derive해서 props로 받음.
// 셔틀 위치만 client-side broadcast로 실시간 갱신.
export function OwnerTripLiveMap({
  tripId,
  stops,
  direction,
}: {
  tripId: string;
  stops: TripLiveMapStop[];
  direction: "PICKUP" | "DROPOFF";
}) {
  const ping = useTripBroadcast(tripId);

  const shuttle = ping
    ? { lat: ping.lat, lng: ping.lng, heading: ping.heading }
    : null;

  return (
    <TripLiveMap
      stops={stops}
      shuttle={shuttle}
      direction={direction}
      height="48vh"
      showCaption
      showStopLabels
    />
  );
}
