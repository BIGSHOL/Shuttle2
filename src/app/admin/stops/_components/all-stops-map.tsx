"use client";

import { useEffect, useState } from "react";

type StopMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  orgName: string;
};

type Props = {
  stops: StopMarker[];
  heightPx?: number;
};

// W24: 매니저 — 모든 학원의 정류장을 한 카카오맵에 cluster로. 클릭 시 정보창에
// orgName·stopName 표시. dynamic import로 SSR-safe.

export function AllStopsMap(props: Props) {
  const [Inner, setInner] =
    useState<React.ComponentType<Props> | null>(null);

  useEffect(() => {
    let mounted = true;
    import("./all-stops-map-inner").then((mod) => {
      if (mounted) setInner(() => mod.AllStopsMapInner);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const h = props.heightPx ?? 480;

  if (!Inner) {
    return (
      <div
        className="bg-muted/30 text-muted-foreground flex w-full items-center justify-center rounded-md border text-sm"
        style={{ height: `${h}px` }}
      >
        지도 로딩 중...
      </div>
    );
  }

  return <Inner {...props} />;
}
