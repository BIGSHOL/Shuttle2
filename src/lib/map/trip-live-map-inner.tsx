"use client";

import {
  CustomOverlayMap,
  Map,
  MapMarker,
  Polyline,
  useKakaoLoader,
} from "react-kakao-maps-sdk";

import { env } from "@/lib/env";

import type { LatLng } from "./types";

export type TripLiveMapStop = {
  id: string; // RouteStop.id
  stopId: string; // Stop.id
  name: string;
  lat: number;
  lng: number;
  order: number;
  isChildStop: boolean; // 학부모 자녀가 타고 내리는 정류장인지
  isPassed: boolean; // driver가 이미 통과한 정류장인지
};

export type TripLiveMapProps = {
  stops: TripLiveMapStop[];
  shuttle: { lat: number; lng: number; heading: number | null } | null;
  // direction: PICKUP(등원)·DROPOFF(하원) — 마커 색조 약간 분리 (선택)
  direction: "PICKUP" | "DROPOFF";
};

export function TripLiveMapInner({
  stops,
  shuttle,
  direction,
}: TripLiveMapProps) {
  const [loading, error] = useKakaoLoader({
    appkey: env.NEXT_PUBLIC_KAKAO_MAP_KEY,
    libraries: ["services"],
  });

  if (error) {
    return (
      <div className="border-destructive/40 bg-destructive/5 text-destructive flex h-[60vh] w-full items-center justify-center rounded-md border text-sm">
        카카오맵 SDK 로드 실패. 잠시 후 다시 시도해 주세요.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-muted/30 text-muted-foreground flex h-[60vh] w-full items-center justify-center rounded-md border text-sm">
        지도 로딩 중...
      </div>
    );
  }

  // center는 셔틀 위치(있으면) → 자녀 stop → 첫 stop 순.
  const childStop = stops.find((s) => s.isChildStop);
  const center: LatLng = shuttle
    ? { lat: shuttle.lat, lng: shuttle.lng }
    : childStop
      ? { lat: childStop.lat, lng: childStop.lng }
      : stops[0]
        ? { lat: stops[0].lat, lng: stops[0].lng }
        : { lat: 37.4979, lng: 127.0276 }; // fallback: 강남역 4번 출구

  // 정류장 polyline (order 순) — 노선 가이드
  const polylinePath = [...stops]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ lat: s.lat, lng: s.lng }));

  const polylineColor = direction === "PICKUP" ? "#10b981" : "#0ea5e9"; // emerald · sky

  return (
    <div className="overflow-hidden rounded-md border">
      <Map center={center} level={4} style={{ width: "100%", height: "60vh" }}>
        {/* 정류장 가이드 라인 */}
        {polylinePath.length >= 2 ? (
          <Polyline
            path={polylinePath}
            strokeWeight={3}
            strokeColor={polylineColor}
            strokeOpacity={0.5}
            strokeStyle="solid"
          />
        ) : null}

        {/* 정류장 마커들 */}
        {stops.map((s) => {
          const fill = s.isChildStop
            ? "#f59e0b" // 자녀 stop — amber
            : s.isPassed
              ? "#9ca3af" // 통과 — gray
              : "#22c55e"; // 미통과 — green

          return (
            <CustomOverlayMap
              key={s.id}
              position={{ lat: s.lat, lng: s.lng }}
              yAnchor={1}
            >
              <div className="flex flex-col items-center">
                <div
                  className="border-background flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold text-white shadow"
                  style={{ backgroundColor: fill }}
                  title={s.name}
                >
                  {s.order + 1}
                </div>
                <div className="bg-background/90 mt-1 rounded px-1.5 py-0.5 text-[10px] font-medium shadow">
                  {s.name}
                  {s.isChildStop ? " ★" : ""}
                </div>
              </div>
            </CustomOverlayMap>
          );
        })}

        {/* 셔틀 마커 — 라이브 위치 */}
        {shuttle ? (
          <MapMarker
            position={{ lat: shuttle.lat, lng: shuttle.lng }}
            image={{
              src:
                "data:image/svg+xml;utf8," +
                encodeURIComponent(
                  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="16" fill="#2563eb" stroke="white" stroke-width="3"/>
                    <text x="20" y="26" text-anchor="middle" font-size="20" fill="white">🚌</text>
                  </svg>`,
                ),
              size: { width: 40, height: 40 },
            }}
          />
        ) : null}
      </Map>
      <p className="bg-muted/30 text-muted-foreground border-t px-3 py-2 text-xs">
        {shuttle
          ? "셔틀 위치는 약 5초마다 갱신됩니다."
          : "셔틀이 운행을 시작하면 위치가 표시됩니다."}
      </p>
    </div>
  );
}
