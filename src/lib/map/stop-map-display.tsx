"use client";

import { useEffect, useState } from "react";

import type { LatLng } from "./types";

type StopMapDisplayProps = {
  position: LatLng;
  radiusM: number;
  name: string;
  heightPx?: number;
};

export function StopMapDisplay(props: StopMapDisplayProps) {
  const [Inner, setInner] =
    useState<React.ComponentType<StopMapDisplayProps> | null>(null);

  useEffect(() => {
    let mounted = true;
    import("./stop-map-display-inner").then((mod) => {
      if (mounted) setInner(() => mod.StopMapDisplayInner);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const h = props.heightPx ?? 360;

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
