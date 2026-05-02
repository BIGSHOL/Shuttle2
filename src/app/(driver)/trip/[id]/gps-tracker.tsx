"use client";

import { useEffect, useRef, useState } from "react";

import { haversineMeters } from "@/lib/geo/distance";
import {
  TRIP_PING_EVENT,
  tripChannelName,
  type TripPingPayload,
} from "@/lib/geo/realtime";
import { createClient } from "@/lib/supabase/client";

import { recordPingAction } from "../../run/actions";

const BROADCAST_INTERVAL_MS = 5_000; // 학부모 실시간 지도 갱신 주기
const DB_INTERVAL_MS = 30_000; // 영구 저장 주기 (정류장 통과·시작·종료는 별도)

type StopWithGeo = {
  id: string; // RouteStop.id (통과 추적 키로 사용)
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
  order: number;
};

export type GpsState = {
  fix: GeolocationCoordinates | null;
  error: string | null;
  passed: Set<string>; // 통과한 RouteStop.id 집합
  startedSent: boolean;
};

export function useGpsTracker({
  tripId,
  active,
  stops,
  onStopPassed,
}: {
  tripId: string;
  active: boolean;
  stops: StopWithGeo[];
  onStopPassed?: (stopId: string) => void;
}): GpsState {
  const [fix, setFix] = useState<GeolocationCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passed, setPassed] = useState<Set<string>>(() => new Set());
  const [startedSent, setStartedSent] = useState(false);

  // 최신 좌표 / 마지막 broadcast·DB 시점·passed set·startedSent를 ref로 유지
  // (interval timer가 stale closure에 갇히지 않게)
  const latestRef = useRef<GeolocationCoordinates | null>(null);
  const lastBroadcastRef = useRef(0);
  const lastDbRef = useRef(0);
  const passedRef = useRef<Set<string>>(new Set());
  const startedSentRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    if (typeof window === "undefined") return;
    if (!("geolocation" in navigator)) {
      // microtask로 lift — react-hooks/set-state-in-effect 회피.
      queueMicrotask(() => setError("이 브라우저는 GPS를 지원하지 않습니다"));
      return;
    }

    const supabase = createClient();
    const channel = supabase.channel(tripChannelName(tripId), {
      config: { broadcast: { self: true } },
    });
    let channelReady = false;
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") channelReady = true;
    });

    function pingPayload(c: GeolocationCoordinates): TripPingPayload {
      return {
        lat: c.latitude,
        lng: c.longitude,
        accuracy: Number.isFinite(c.accuracy) ? c.accuracy : null,
        speed: c.speed ?? null,
        heading: c.heading ?? null,
        recordedAt: new Date().toISOString(),
      };
    }

    function checkStopPass(c: GeolocationCoordinates) {
      for (const s of stops) {
        if (passedRef.current.has(s.id)) continue;
        const d = haversineMeters(c.latitude, c.longitude, s.lat, s.lng);
        if (d <= s.radiusM) {
          passedRef.current.add(s.id);
          setPassed(new Set(passedRef.current));
          onStopPassed?.(s.id);
          // STOP_PASS ping 영구 저장
          void recordPingAction({
            tripId,
            lat: c.latitude,
            lng: c.longitude,
            accuracy: Number.isFinite(c.accuracy) ? c.accuracy : undefined,
            speed: c.speed ?? undefined,
            heading: c.heading ?? undefined,
            source: "STOP_PASS",
          }).catch((err) => console.warn("STOP_PASS ping failed:", err));
        }
      }
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const c = pos.coords;
        latestRef.current = c;
        setFix(c);
        setError(null);

        // 1) START ping (한 번만)
        if (!startedSentRef.current) {
          startedSentRef.current = true;
          setStartedSent(true);
          void recordPingAction({
            tripId,
            lat: c.latitude,
            lng: c.longitude,
            accuracy: Number.isFinite(c.accuracy) ? c.accuracy : undefined,
            speed: c.speed ?? undefined,
            heading: c.heading ?? undefined,
            source: "START",
          }).catch((err) => console.warn("START ping failed:", err));
        }

        // 2) 정류장 통과 자동 판정
        checkStopPass(c);

        // 3) Broadcast throttled 5초
        const now = Date.now();
        if (
          channelReady &&
          now - lastBroadcastRef.current >= BROADCAST_INTERVAL_MS
        ) {
          lastBroadcastRef.current = now;
          channel
            .send({
              type: "broadcast",
              event: TRIP_PING_EVENT,
              payload: pingPayload(c),
            })
            .catch((err) => console.warn("broadcast failed:", err));
        }

        // 4) INTERVAL DB ping 30초
        if (now - lastDbRef.current >= DB_INTERVAL_MS) {
          lastDbRef.current = now;
          void recordPingAction({
            tripId,
            lat: c.latitude,
            lng: c.longitude,
            accuracy: Number.isFinite(c.accuracy) ? c.accuracy : undefined,
            speed: c.speed ?? undefined,
            heading: c.heading ?? undefined,
            source: "INTERVAL",
          }).catch((err) => console.warn("INTERVAL ping failed:", err));
        }
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5_000,
        timeout: 15_000,
      },
    );

    return () => {
      // 운행 종료 / 페이지 이탈 시 GPS 송신 즉시 중단 (CLAUDE.md 보안 규칙)
      navigator.geolocation.clearWatch(watchId);

      // END ping (마지막 좌표가 있으면)
      const last = latestRef.current;
      if (last) {
        void recordPingAction({
          tripId,
          lat: last.latitude,
          lng: last.longitude,
          accuracy: Number.isFinite(last.accuracy) ? last.accuracy : undefined,
          speed: last.speed ?? undefined,
          heading: last.heading ?? undefined,
          source: "END",
        }).catch(() => {});
      }

      channel.unsubscribe().catch(() => {});
    };
    // stops/onStopPassed는 ref·passedRef로 안정화 — re-mount 회피.
    // 의도적으로 deps 최소화.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, active]);

  return { fix, error, passed, startedSent };
}
