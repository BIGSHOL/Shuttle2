"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import {
  TRIP_PING_EVENT,
  tripChannelName,
  type TripPingPayload,
} from "./realtime";

// 학부모 측에서 driver의 GPS broadcast(`trip:<tripId>` 채널, `ping` event)를
// 구독해서 현재 셔틀 위치를 받아온다. driver의 useGpsTracker가 5초 간격으로
// publish하는 같은 payload를 받음.
//
// driver가 운행을 종료하거나 학부모가 화면을 떠나면 channel.unsubscribe.
export function useTripBroadcast(tripId: string): TripPingPayload | null {
  const [latest, setLatest] = useState<TripPingPayload | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(tripChannelName(tripId));

    channel.on(
      "broadcast",
      { event: TRIP_PING_EVENT },
      ({ payload }: { payload: TripPingPayload }) => {
        setLatest(payload);
      },
    );

    channel.subscribe();

    return () => {
      channel.unsubscribe().catch(() => {});
    };
  }, [tripId]);

  return latest;
}
