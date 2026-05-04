"use client";

import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import {
  TRIP_UPDATE_EVENT,
  orgTripsChannelName,
  type TripUpdatePayload,
} from "./realtime";

// org-trips:<orgId> 채널의 "update" 이벤트 구독.
// 학원장 dashboard·운행 모니터에서 사용 — 어떤 trip이든 변동되면 1번 refresh.
// useTripUpdates와 동일한 debounce 패턴이지만 채널 prefix만 다름.
const DEBOUNCE_MS = 600;

export function useOrgTripsUpdates(
  orgId: string,
  onUpdate: () => void,
): TripUpdatePayload | null {
  const [latest, setLatest] = useState<TripUpdatePayload | null>(null);

  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(orgTripsChannelName(orgId));

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
  }, [orgId]);

  return latest;
}
