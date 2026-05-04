"use client";

import { useEffect, useState } from "react";

import type { LatLng } from "./types";

type StopMapPickerProps = {
  position: LatLng;
  radiusM: number;
  onPick: (next: LatLng) => void;
  onAddressChange?: (address: string | null) => void;
};

export function StopMapPicker(props: StopMapPickerProps) {
  const [Inner, setInner] =
    useState<React.ComponentType<StopMapPickerProps> | null>(null);

  useEffect(() => {
    let mounted = true;
    import("./stop-map-picker-inner").then((mod) => {
      if (mounted) setInner(() => mod.StopMapPickerInner);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!Inner) {
    return (
      <div className="bg-muted/30 text-muted-foreground flex h-[420px] w-full items-center justify-center rounded-md border text-sm">
        지도 로딩 중...
      </div>
    );
  }

  return <Inner {...props} />;
}
