"use client";

import { useEffect, useRef, useState } from "react";

import { haversineMeters } from "@/lib/geo/distance";
import { createClient } from "@/lib/supabase/client";

import {
  TRIP_PING_EVENT,
  tripChannelName,
  type TripPingPayload,
} from "./realtime";

// W19-B: useTripBroadcast의 확장 — 받은 ping을 trail로 누적까지.
// useTripBroadcast는 단일 ping만 반환했고, OwnerTripLiveMap에서 useEffect로
// trail 상태를 별도 관리했지만 react-hooks/set-state-in-effect 룰이 cascading
// render를 경고. 이 hook은 broadcast handler 콜백 안에서 둘 다 setState 하므로
// 룰 위반 없음.
//
// 사용 예: 학원장 trip 상세에서 진입 시점까지의 LocationPing(30s grain) trail을
// initialTrail로 받고, 이후 broadcast 5s ping을 append.

export function useTripBroadcastWithTrail(
  tripId: string,
  initialTrail: { lat: number; lng: number }[],
): {
  ping: TripPingPayload | null;
  trail: { lat: number; lng: number }[];
} {
  const [ping, setPing] = useState<TripPingPayload | null>(null);
  const [trail, setTrail] = useState<{ lat: number; lng: number }[]>(
    initialTrail,
  );

  // initialTrail이 router.refresh 등으로 새 reference가 되면 trail reset.
  // ref 비교로 불필요 reset 방지.
  const lastInitialRef = useRef(initialTrail);
  useEffect(() => {
    if (lastInitialRef.current !== initialTrail) {
      lastInitialRef.current = initialTrail;
      setTrail(initialTrail);
    }
  }, [initialTrail]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(tripChannelName(tripId));

    channel.on(
      "broadcast",
      { event: TRIP_PING_EVENT },
      ({ payload }: { payload: TripPingPayload }) => {
        // 콜백 안에서의 setState는 권장 패턴 — cascading render 경고 없음.
        setPing(payload);
        setTrail((prev) => {
          const last = prev[prev.length - 1];
          if (
            last &&
            haversineMeters(last.lat, last.lng, payload.lat, payload.lng) < 5
          ) {
            return prev; // 거의 같은 위치 — append 안 함 (정지 중 dedup)
          }
          return [...prev, { lat: payload.lat, lng: payload.lng }];
        });
      },
    );

    channel.subscribe();

    return () => {
      channel.unsubscribe().catch(() => {});
    };
  }, [tripId]);

  return { ping, trail };
}
