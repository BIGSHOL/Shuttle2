"use client";

import { Circle, Map, MapMarker, useKakaoLoader } from "react-kakao-maps-sdk";

import type { LatLng } from "./types";

// W21-C: read-only 정류장 위치 표시. picker(검색·onPick·내 위치) 없는 단순 표시 모드.
// 학원장 정류장 detail 페이지(/stops/[id])용.

export function StopMapDisplayInner({
  position,
  radiusM,
  name,
  heightPx = 360,
}: {
  position: LatLng;
  radiusM: number;
  name: string;
  heightPx?: number;
}) {
  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? "",
  });

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

  return (
    <div className="overflow-hidden rounded-md border">
      <Map
        center={position}
        level={3}
        style={{ width: "100%", height: `${heightPx}px` }}
      >
        <MapMarker position={position} title={name} />
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
        노란 원은 도착 판정 반경({radiusM}m)이에요.
      </p>
    </div>
  );
}
