"use client";

import { useTripBroadcastWithTrail } from "@/lib/geo/use-trip-broadcast-with-trail";
import { TripLiveMap } from "@/lib/map/trip-live-map";
import type { TripLiveMapStop } from "@/lib/map/trip-live-map-inner";

// 학원장 trip 상세 화면의 라이브 GPS 지도.
// 기사 폰이 5초 간격으로 trip:<tripId> 채널에 ping을 broadcast — 학부모 trip-live와
// 같은 채널이지만 학원장은 child-stop 강조 없이 모든 정류장을 동등하게 본다.
//
// W19-B: trail은 hybrid 방식.
// - initialTrail: server에서 LocationPing(30초 grain)으로 진입 시점까지 누적 fetch
// - 진입 후 broadcast로 받은 5초 grain ping은 useTripBroadcastWithTrail이 자동 append
// - 직전 좌표와 ~5m 이내면 dedup (정지 중 점 누적 방지)
// - polyline은 기존 trip-live-map-inner의 노란색 trail prop 그대로 활용
export function OwnerTripLiveMap({
  tripId,
  stops,
  direction,
  initialTrail,
}: {
  tripId: string;
  stops: TripLiveMapStop[];
  direction: "PICKUP" | "DROPOFF";
  initialTrail: { lat: number; lng: number }[];
}) {
  const { ping, trail } = useTripBroadcastWithTrail(tripId, initialTrail);

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
      trail={trail.length >= 2 ? trail : undefined}
    />
  );
}
