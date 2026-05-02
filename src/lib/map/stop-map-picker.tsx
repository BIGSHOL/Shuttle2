"use client";

import { Circle, Map, MapMarker, useKakaoLoader } from "react-kakao-maps-sdk";

import { env } from "@/lib/env";

type LatLng = { lat: number; lng: number };

export function StopMapPicker({
  position,
  radiusM,
  onPick,
}: {
  position: LatLng;
  radiusM: number;
  onPick: (next: LatLng) => void;
}) {
  const [loading, error] = useKakaoLoader({
    appkey: env.NEXT_PUBLIC_KAKAO_MAP_KEY,
    libraries: ["services"],
  });

  if (error) {
    return (
      <div className="border-destructive/40 bg-destructive/5 text-destructive flex h-[420px] w-full items-center justify-center rounded-md border text-sm">
        카카오맵 SDK 로드 실패. NEXT_PUBLIC_KAKAO_MAP_KEY를 확인하세요.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-muted/30 text-muted-foreground flex h-[420px] w-full items-center justify-center rounded-md border text-sm">
        지도 로딩 중...
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <Map
        center={position}
        level={3}
        style={{ width: "100%", height: "420px" }}
        onClick={(_target, mouseEvent) => {
          onPick({
            lat: mouseEvent.latLng.getLat(),
            lng: mouseEvent.latLng.getLng(),
          });
        }}
      >
        <MapMarker position={position} draggable={false} />
        <Circle
          center={position}
          radius={radiusM}
          strokeWeight={2}
          strokeColor="#f59e0b"
          strokeOpacity={0.9}
          strokeStyle="solid"
          fillColor="#fbbf24"
          fillOpacity={0.25}
        />
      </Map>
      <p className="bg-muted/30 text-muted-foreground border-t px-3 py-2 text-xs">
        지도를 클릭하면 그 지점이 정류장 위치가 됩니다. 노란 원은 도착 판정
        반경({radiusM}m)을 보여줍니다.
      </p>
    </div>
  );
}
