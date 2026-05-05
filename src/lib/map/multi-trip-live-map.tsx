"use client";

import { useEffect, useState } from "react";

import type { MultiTripLiveMapProps } from "./multi-trip-live-map-inner";

// 학원장 dashboard 멀티 trip 라이브 지도 wrapper.
// react-kakao-maps-sdk는 SSR 안 됨 → useEffect + dynamic import로 mount guard.
// (trip-live-map.tsx와 동일 패턴)
export function MultiTripLiveMap(props: MultiTripLiveMapProps) {
  const [Inner, setInner] =
    useState<React.ComponentType<MultiTripLiveMapProps> | null>(null);

  useEffect(() => {
    let mounted = true;
    import("./multi-trip-live-map-inner").then((mod) => {
      if (mounted) setInner(() => mod.MultiTripLiveMapInner);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!Inner) {
    return (
      <div
        className="bg-muted/30 text-muted-foreground flex w-full items-center justify-center text-sm"
        style={{ height: props.height ?? "50vh" }}
      >
        지도 로딩 중...
      </div>
    );
  }

  return <Inner {...props} />;
}
