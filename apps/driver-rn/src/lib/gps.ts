// react-native-background-geolocation 기반 GPS tracker.
// PWA의 src/app/(driver)/trip/[id]/gps-tracker.tsx 로직을 RN으로 1:1 포팅.
//
// 안드로이드 Foreground Service로 화면이 꺼져도 5초 broadcast 유지.
// 영구 알림(notification)이 보여 사용자에게 송신 상태 인지.
//
// 핸들러 4가지:
//   1) START — 첫 GPS fix
//   2) 5초 throttle Supabase channel.send (학부모 실시간 지도용)
//   3) 30초 throttle POST /api/driver/trip/[id]/ping (LocationPing INTERVAL)
//   4) STOP_PASS — 정류장 반경 진입 자동 판정 → 서버에 ping → 학부모 push
//   5) END — 종료 시 마지막 좌표

import BackgroundGeolocation, {
  type Location,
} from "react-native-background-geolocation";

import {
  haversineMeters,
  TRIP_PING_EVENT,
  tripChannelName,
  type TripPingPayload,
} from "@shuttlee/shared-contracts";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { apiFetch } from "./api-client";
import { supabase } from "./supabase";

const BROADCAST_INTERVAL_MS = 5_000;
const DB_INTERVAL_MS = 30_000;

export type GpsStop = {
  id: string; // RouteStop.id (passed set 키)
  lat: number;
  lng: number;
  radiusM: number;
};

type StartOptions = {
  tripId: string;
  stops: GpsStop[];
  onStopPassed?: (stopId: string) => void;
  onLocation?: (loc: TripPingPayload) => void;
  onError?: (message: string) => void;
};

// module-level singleton state — 운행은 한 번에 1개만.
let active = false;
let currentTripId: string | null = null;
let currentStops: GpsStop[] = [];
let onStopPassedHandler: ((stopId: string) => void) | undefined;
let onLocationHandler: ((loc: TripPingPayload) => void) | undefined;
let onErrorHandler: ((message: string) => void) | undefined;
let startedSent = false;
let passedSet = new Set<string>();
let lastBroadcast = 0;
let lastDb = 0;
let channel: RealtimeChannel | null = null;
let channelReady = false;
let locationSub: { remove: () => void } | null = null;

function pingPayloadFromLocation(loc: Location): TripPingPayload {
  return {
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    accuracy: Number.isFinite(loc.coords.accuracy)
      ? loc.coords.accuracy
      : null,
    speed: loc.coords.speed ?? null,
    heading: loc.coords.heading ?? null,
    recordedAt: new Date(loc.timestamp).toISOString(),
  };
}

async function sendPing(
  tripId: string,
  loc: Location,
  source: "INTERVAL" | "STOP_PASS" | "START" | "END",
): Promise<void> {
  await apiFetch(`/api/driver/trip/${tripId}/ping`, {
    method: "POST",
    body: {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      accuracy: Number.isFinite(loc.coords.accuracy)
        ? loc.coords.accuracy
        : undefined,
      speed: loc.coords.speed ?? undefined,
      heading: loc.coords.heading ?? undefined,
      source,
    },
  });
}

function checkStopPass(loc: Location): void {
  if (!currentTripId) return;
  for (const s of currentStops) {
    if (passedSet.has(s.id)) continue;
    const d = haversineMeters(
      loc.coords.latitude,
      loc.coords.longitude,
      s.lat,
      s.lng,
    );
    if (d <= s.radiusM) {
      passedSet.add(s.id);
      onStopPassedHandler?.(s.id);
      void sendPing(currentTripId, loc, "STOP_PASS").catch((e) =>
        console.warn("STOP_PASS ping failed:", e),
      );
    }
  }
}

async function handleLocation(loc: Location): Promise<void> {
  if (!active || !currentTripId) return;
  const tripId = currentTripId;

  // 1) START ping 한 번만
  if (!startedSent) {
    startedSent = true;
    void sendPing(tripId, loc, "START").catch((e) =>
      console.warn("START ping failed:", e),
    );
  }

  // 2) 정류장 통과 자동 판정
  checkStopPass(loc);

  const now = Date.now();
  const payload = pingPayloadFromLocation(loc);

  // 3) UI hook
  onLocationHandler?.(payload);

  // 4) 5초 throttle broadcast
  if (channelReady && channel && now - lastBroadcast >= BROADCAST_INTERVAL_MS) {
    lastBroadcast = now;
    channel
      .send({
        type: "broadcast",
        event: TRIP_PING_EVENT,
        payload,
      })
      .catch((e) => console.warn("broadcast failed:", e));
  }

  // 5) 30초 INTERVAL DB ping
  if (now - lastDb >= DB_INTERVAL_MS) {
    lastDb = now;
    void sendPing(tripId, loc, "INTERVAL").catch((e) =>
      console.warn("INTERVAL ping failed:", e),
    );
  }
}

async function ensureChannel(tripId: string): Promise<void> {
  if (channel) return;
  channel = supabase.channel(tripChannelName(tripId), {
    config: { broadcast: { self: true } },
  });
  await new Promise<void>((resolve) => {
    channel?.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channelReady = true;
        resolve();
      }
    });
  });
}

export async function startGps(opts: StartOptions): Promise<void> {
  if (active) return;
  active = true;
  currentTripId = opts.tripId;
  currentStops = opts.stops;
  onStopPassedHandler = opts.onStopPassed;
  onLocationHandler = opts.onLocation;
  onErrorHandler = opts.onError;
  startedSent = false;
  passedSet = new Set();
  lastBroadcast = 0;
  lastDb = 0;

  await ensureChannel(opts.tripId);

  await BackgroundGeolocation.ready({
    desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
    distanceFilter: 0,
    locationUpdateInterval: 5_000,
    fastestLocationUpdateInterval: 5_000,
    foregroundService: true,
    stopOnTerminate: true,
    startOnBoot: false,
    debug: false,
    logLevel: BackgroundGeolocation.LOG_LEVEL_WARNING,
    notification: {
      title: "운행 중 — 위치 송신",
      text: "셔틀이 기사 앱이 위치를 송신하고 있어요.",
      priority: BackgroundGeolocation.NOTIFICATION_PRIORITY_MAX,
      sticky: true,
    },
  });

  locationSub = BackgroundGeolocation.onLocation(
    (loc) => {
      void handleLocation(loc).catch((e) => {
        console.warn("handleLocation error:", e);
        onErrorHandler?.(e instanceof Error ? e.message : "GPS 처리 실패");
      });
    },
    (err) => {
      // LocationError는 number 코드 (0, 1, 408 등). 메시지 형식으로 변환.
      console.warn("BackgroundGeolocation error code:", err);
      onErrorHandler?.(`GPS 오류 (코드 ${err})`);
    },
  );

  await BackgroundGeolocation.start();
}

export async function stopGps(): Promise<void> {
  if (!active) return;
  const tripId = currentTripId;
  active = false;

  // END ping — 마지막 좌표 있으면
  if (tripId) {
    try {
      const last = await BackgroundGeolocation.getCurrentPosition({
        timeout: 5,
        maximumAge: 30_000,
        samples: 1,
      });
      await sendPing(tripId, last, "END").catch(() => {});
    } catch {
      // 좌표 못 가져오면 그냥 종료
    }
  }

  try {
    await BackgroundGeolocation.stop();
  } catch (e) {
    console.warn("BackgroundGeolocation.stop failed:", e);
  }

  locationSub?.remove();
  locationSub = null;

  if (channel) {
    void supabase.removeChannel(channel);
    channel = null;
    channelReady = false;
  }
  currentTripId = null;
  currentStops = [];
  onStopPassedHandler = undefined;
  onLocationHandler = undefined;
  onErrorHandler = undefined;
}
