"use client";

import dynamic from "next/dynamic";

import type { LatLng } from "./types";

// react-kakao-maps-sdk는 SSR 시 window.kakao를 건드려 throw하므로
// 클라이언트에서만 import. Next.js의 next/dynamic + ssr:false로 격리.
const StopMapPickerInner = dynamic(
  () => import("./stop-map-picker-inner").then((m) => m.StopMapPickerInner),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/30 text-muted-foreground flex h-[420px] w-full items-center justify-center rounded-md border text-sm">
        지도 로딩 중...
      </div>
    ),
  },
);

export function StopMapPicker(props: {
  position: LatLng;
  radiusM: number;
  onPick: (next: LatLng) => void;
}) {
  return <StopMapPickerInner {...props} />;
}
