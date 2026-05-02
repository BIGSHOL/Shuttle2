"use client";

import { useEffect, useState } from "react";

import type { TripLiveMapProps } from "./trip-live-map-inner";

// 학부모 trip-live 페이지에서 사용하는 display-only 카카오맵.
// react-kakao-maps-sdk가 SSR을 깨므로 stop-map-picker.tsx와 동일하게
// useEffect + dynamic import로 mount guard.
export function TripLiveMap(props: TripLiveMapProps) {
  const [Inner, setInner] =
    useState<React.ComponentType<TripLiveMapProps> | null>(null);

  useEffect(() => {
    let mounted = true;
    import("./trip-live-map-inner").then((mod) => {
      if (mounted) setInner(() => mod.TripLiveMapInner);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!Inner) {
    return (
      <div className="bg-muted/30 text-muted-foreground flex h-[60vh] w-full items-center justify-center rounded-md border text-sm">
        지도 로딩 중...
      </div>
    );
  }

  return <Inner {...props} />;
}
