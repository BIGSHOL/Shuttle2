// Supabase Realtime trip:<tripId> 채널 구독 hook.
// PWA의 src/lib/geo/use-trip-broadcast.ts를 RN으로 포팅 — 같은 채널 이름·이벤트
// 이름을 사용하므로 학부모 PWA·학원장 dashboard와 즉시 호환.
//
// 두 가지 broadcast 이벤트:
// - "ping": 5초 간격 GPS 좌표 (Day 5-6에서 RN이 직접 send)
// - "update": boarding/safety/issue/trip-state 변경 알림 (RN→서버 mutation 직후
//             서버가 publishTripUpdate로 broadcast → 같은 채널 다른 클라이언트들 갱신)

import { useEffect, useRef, useState } from "react";

import {
  TRIP_PING_EVENT,
  TRIP_UPDATE_EVENT,
  tripChannelName,
  type TripPingPayload,
  type TripUpdatePayload,
} from "@shuttlee/shared-contracts";

import { supabase } from "./supabase";

export type RealtimeStatus = "connecting" | "ok" | "error";

export function useTripBroadcast(tripId: string | null) {
  const [latestPing, setLatestPing] = useState<TripPingPayload | null>(null);
  const [lastUpdate, setLastUpdate] = useState<TripUpdatePayload | null>(null);
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  const updateCountRef = useRef(0);

  useEffect(() => {
    if (!tripId) {
      setStatus("connecting");
      return;
    }
    setStatus("connecting");

    const channel = supabase.channel(tripChannelName(tripId), {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: TRIP_PING_EVENT }, (msg) => {
        setLatestPing(msg.payload as TripPingPayload);
      })
      .on("broadcast", { event: TRIP_UPDATE_EVENT }, (msg) => {
        updateCountRef.current += 1;
        setLastUpdate(msg.payload as TripUpdatePayload);
      })
      .subscribe((subStatus) => {
        if (subStatus === "SUBSCRIBED") {
          setStatus("ok");
        } else if (subStatus === "CHANNEL_ERROR" || subStatus === "TIMED_OUT") {
          setStatus("error");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tripId]);

  return { latestPing, lastUpdate, status, updateCount: updateCountRef.current };
}

// RN이 직접 GPS broadcast를 publish할 때 사용.
// Day 5-6의 gps.ts에서 channel.send를 호출.
export async function publishTripPing(
  tripId: string,
  payload: TripPingPayload,
): Promise<void> {
  const channel = supabase.channel(tripChannelName(tripId));
  await new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
    });
  });
  await channel.send({
    type: "broadcast",
    event: TRIP_PING_EVENT,
    payload,
  });
  // fire-and-forget — 일반적으로 channel은 운행 동안 살아있음.
  // Day 5-6에서는 channel을 운행 시작 시 1회 subscribe + send 반복.
}
