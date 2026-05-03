"use client";

import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import {
  TRIP_UPDATE_EVENT,
  tripChannelName,
  type TripUpdatePayload,
} from "./realtime";

// trip:<tripId> 채널의 "update" 이벤트 구독.
// 같은 채널의 "ping"(driver GPS)와 공존 — event 이름으로 분기되므로 안전.
//
// 짧은 시간에 여러 변동이 몰릴 수 있으므로(예: 정류장에서 학생 5명 연속 탑승)
// debounce. 마지막 이벤트 기준으로 한 번만 onUpdate 호출.
//
// 반환: 마지막으로 받은 update payload. UI에서 "방금 갱신됨" 같은 인디케이터에 활용.
const DEBOUNCE_MS = 400;

export function useTripUpdates(
  tripId: string,
  onUpdate: () => void,
): TripUpdatePayload | null {
  const [latest, setLatest] = useState<TripUpdatePayload | null>(null);

  // onUpdate identity 변동에 useEffect가 재구독되지 않도록 ref로 우회.
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(tripChannelName(tripId));

    let timer: ReturnType<typeof setTimeout> | null = null;

    channel.on(
      "broadcast",
      { event: TRIP_UPDATE_EVENT },
      ({ payload }: { payload: TripUpdatePayload }) => {
        setLatest(payload);
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          onUpdateRef.current();
        }, DEBOUNCE_MS);
      },
    );

    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      channel.unsubscribe().catch(() => {});
    };
  }, [tripId]);

  return latest;
}
