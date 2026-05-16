"use client";

import { useState } from "react";
import {
  Map,
  MapInfoWindow,
  MapMarker,
  MarkerClusterer,
  useKakaoLoader,
} from "react-kakao-maps-sdk";

type StopMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  orgName: string;
};

// W24: 매니저 — 모든 학원의 정류장 cluster 지도.
// Center는 first stop (학원 다 한국이라 mapBounds 자동 fit는 추가 작업, 단순화 위해 first stop).

const KOREA_CENTER = { lat: 36.5, lng: 127.8 }; // 한국 중심

export function AllStopsMapInner({
  stops,
  heightPx = 480,
}: {
  stops: StopMarker[];
  heightPx?: number;
}) {
  // W26-D: libraries 옵션 통일. react-kakao-maps-sdk는 SPA navigation 후에도
  // window.kakao를 재사용하므로 services 빠진 채 한 번 로드되면 다른 페이지의
  // picker 검색이 깨짐. picker·trip-live와 동일하게 services 포함.
  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? "",
    libraries: ["services"],
  });
  const [openId, setOpenId] = useState<string | null>(null);

  if (error) {
    return (
      <div
        className="border-destructive/40 bg-destructive/5 text-destructive flex w-full items-center justify-center rounded-md border text-sm"
        style={{ height: `${heightPx}px` }}
      >
        카카오맵을 불러오지 못했어요.
      </div>
    );
  }
  if (loading) {
    return (
      <div
        className="bg-muted/30 text-muted-foreground flex w-full items-center justify-center rounded-md border text-sm"
        style={{ height: `${heightPx}px` }}
      >
        지도 로딩 중...
      </div>
    );
  }

  const center = stops[0]
    ? { lat: stops[0].lat, lng: stops[0].lng }
    : KOREA_CENTER;
  const level = stops.length > 50 ? 9 : stops.length > 10 ? 7 : 4;

  return (
    <div className="overflow-hidden rounded-lg border">
      <Map
        center={center}
        level={level}
        style={{ width: "100%", height: `${heightPx}px` }}
      >
        <MarkerClusterer averageCenter minLevel={6}>
          {stops.map((s) => (
            <MapMarker
              key={s.id}
              position={{ lat: s.lat, lng: s.lng }}
              onClick={() =>
                setOpenId((prev) => (prev === s.id ? null : s.id))
              }
            >
              {openId === s.id ? (
                <MapInfoWindow position={{ lat: s.lat, lng: s.lng }}>
                  <div style={{ padding: "6px 8px", fontSize: "12px" }}>
                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                    <div style={{ color: "#888" }}>{s.orgName}</div>
                  </div>
                </MapInfoWindow>
              ) : null}
            </MapMarker>
          ))}
        </MarkerClusterer>
      </Map>
      <p className="bg-muted/30 text-muted-foreground border-t px-3 py-2 text-xs">
        cluster 클릭 시 zoom in. 마커 클릭 시 학원·정류장 이름 확인.
      </p>
    </div>
  );
}
