"use client";

import {
  CustomOverlayMap,
  Map,
  Polyline,
  useKakaoLoader,
} from "react-kakao-maps-sdk";

import type { LatLng } from "./types";

// W19-C: 학원장 dashboard 상단 멀티 trip 라이브 지도.
// 운행 중인 모든 셔틀(차량 N대)을 한 카카오맵에 동시 표시.
//
// 각 trip마다:
// - 노선 polyline (PICKUP=초록, DROPOFF=파랑) 옅게
// - 정류장 마커 (통과 회색, 미통과 노선색)
// - 셔틀 마커 (노란 원 + 차량번호 라벨, ping 있을 때만)
//
// trail은 안 그림 — dashboard에서 N개 trip 각각 trail까지 그리면 시각적 혼잡 + 부하.
// 학원장이 특정 trip의 trail을 보고 싶으면 마커 클릭 → 해당 trip 상세로 이동.

export type MultiTripDescriptor = {
  id: string;
  vehiclePlate: string;
  routeName: string;
  direction: "PICKUP" | "DROPOFF";
  stops: { id: string; name: string; lat: number; lng: number; order: number }[];
  // 현재 ping (없으면 null — 마커 안 그림). MultiTripLiveSection이 useTripBroadcast로
  // 받아 매 trip별로 채워줌.
  ping: { lat: number; lng: number; heading: number | null } | null;
};

export type MultiTripLiveMapProps = {
  trips: MultiTripDescriptor[];
  /** 마커 클릭 시 호출. 학원장 dashboard에서 trip 상세로 이동. */
  onTripClick?: (tripId: string) => void;
  height?: string;
};

export function MultiTripLiveMapInner({
  trips,
  onTripClick,
  height = "50vh",
}: MultiTripLiveMapProps) {
  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? "",
    libraries: ["services"],
  });

  if (error) {
    return (
      <div
        className="border-destructive/40 bg-destructive/5 text-destructive flex w-full items-center justify-center text-sm"
        style={{ height }}
      >
        카카오맵 로드 실패. 잠시 후 다시 시도해 주세요.
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="bg-muted/30 text-muted-foreground flex w-full items-center justify-center text-sm"
        style={{ height }}
      >
        지도 로딩 중...
      </div>
    );
  }

  // 모든 stops + 모든 ping 좌표 모아 bounds 자동 fit. 단순 평균 중심점 + level=6 정도.
  const allPoints: LatLng[] = [];
  for (const t of trips) {
    for (const s of t.stops) allPoints.push({ lat: s.lat, lng: s.lng });
    if (t.ping) allPoints.push({ lat: t.ping.lat, lng: t.ping.lng });
  }
  const center: LatLng =
    allPoints.length > 0
      ? {
          lat:
            allPoints.reduce((s, p) => s + p.lat, 0) / allPoints.length,
          lng:
            allPoints.reduce((s, p) => s + p.lng, 0) / allPoints.length,
        }
      : { lat: 37.4979, lng: 127.0276 }; // fallback: 서울 강남

  return (
    <div className="relative w-full overflow-hidden">
      <Map center={center} level={6} style={{ width: "100%", height }}>
        {/* 각 trip별 노선 polyline + 정류장 마커 */}
        {trips.map((trip) => {
          const polylineColor =
            trip.direction === "PICKUP" ? "#10b981" : "#0ea5e9";
          const polylinePath = [...trip.stops]
            .sort((a, b) => a.order - b.order)
            .map((s) => ({ lat: s.lat, lng: s.lng }));

          return (
            <div key={trip.id}>
              {polylinePath.length >= 2 ? (
                <Polyline
                  path={polylinePath}
                  strokeWeight={2}
                  strokeColor={polylineColor}
                  strokeOpacity={0.4}
                  strokeStyle="solid"
                />
              ) : null}

              {trip.stops.map((s) => (
                <CustomOverlayMap
                  key={`${trip.id}-${s.id}`}
                  position={{ lat: s.lat, lng: s.lng }}
                  yAnchor={1}
                >
                  <div
                    className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[10px] font-extrabold text-white shadow"
                    style={{ backgroundColor: polylineColor, opacity: 0.85 }}
                    title={`${trip.routeName} · ${s.name}`}
                  >
                    {s.order}
                  </div>
                </CustomOverlayMap>
              ))}
            </div>
          );
        })}

        {/* 각 trip별 셔틀 마커 (ping 있는 것만) */}
        {trips
          .filter((t) => t.ping !== null)
          .map((trip) => {
            const ping = trip.ping;
            if (!ping) return null;
            return (
              <CustomOverlayMap
                key={`${trip.id}-shuttle`}
                position={{ lat: ping.lat, lng: ping.lng }}
                yAnchor={0.5}
                xAnchor={0.5}
              >
                <button
                  type="button"
                  onClick={() => onTripClick?.(trip.id)}
                  className="group flex flex-col items-center"
                  aria-label={`${trip.routeName} (${trip.vehiclePlate})`}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white text-base font-bold shadow-lg transition-transform group-hover:scale-110"
                    style={{
                      backgroundColor: "#f5c518",
                      boxShadow:
                        "0 6px 18px rgba(245,197,24,.45), 0 0 0 4px rgba(245,197,24,.18)",
                    }}
                  >
                    🚌
                  </div>
                  <div className="bg-background/95 mt-1 rounded-md border px-1.5 py-0.5 text-[10px] font-extrabold shadow">
                    {trip.vehiclePlate}
                  </div>
                </button>
              </CustomOverlayMap>
            );
          })}
      </Map>
    </div>
  );
}
