// expo-location 기반 GPS tracker (W23+ — react-native-background-geolocation
// license validation 회피를 위해 교체).
//
// 안드로이드 Foreground Service로 화면 꺼져도 5초 broadcast 유지.
// expo-location의 startLocationUpdatesAsync가 자체 native Foreground Service를
// 띄우고 영구 알림 표시. iOS는 background 사용 안 함 (베타는 안드로이드만).
//
// 핸들러 4가지 (PWA gps-tracker.tsx 로직 1:1 포팅):
//   1) START — 첫 GPS fix
//   2) 5초 throttle Supabase channel.send (학부모 실시간 지도용)
//   3) 30초 throttle POST /api/driver/trip/[id]/ping (LocationPing INTERVAL)
//   4) STOP_PASS — 정류장 반경 진입 자동 판정 → 서버에 ping → 학부모 push
//   5) END — 종료 시 마지막 좌표

import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import {
  haversineMeters,
  TRIP_PING_EVENT,
  tripChannelName,
  type TripPingPayload,
} from "@shuttlee/shared-contracts";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { apiFetch } from "./api-client";
import { supabase } from "./supabase";

const LOCATION_TASK = "shuttlee-trip-location";
const BROADCAST_INTERVAL_MS = 5_000;
const DB_INTERVAL_MS = 30_000;

export type GpsStop = {
  id: string; // RouteStop.id (passed set 키)
  lat: number;
  lng: number;
  radiusM: number;
};

type ActiveState = {
  tripId: string;
  stops: GpsStop[];
  onLocation?: (loc: TripPingPayload) => void;
  onStopPassed?: (stopId: string) => void;
  onError?: (msg: string) => void;
  startedSent: boolean;
  passed: Set<string>;
  lastBroadcast: number;
  lastDb: number;
  channel: RealtimeChannel | null;
  channelReady: boolean;
};

// 한 번에 active trip 1개만. module-level singleton.
let active: ActiveState | null = null;

function pingPayloadFromLocation(loc: Location.LocationObject): TripPingPayload {
  return {
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    accuracy:
      typeof loc.coords.accuracy === "number" && Number.isFinite(loc.coords.accuracy)
        ? loc.coords.accuracy
        : null,
    speed: loc.coords.speed ?? null,
    heading: loc.coords.heading ?? null,
    recordedAt: new Date(loc.timestamp).toISOString(),
  };
}

async function sendPing(
  tripId: string,
  loc: Location.LocationObject,
  source: "INTERVAL" | "STOP_PASS" | "START" | "END",
): Promise<void> {
  await apiFetch(`/api/driver/trip/${tripId}/ping`, {
    method: "POST",
    body: {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      accuracy:
        typeof loc.coords.accuracy === "number" && Number.isFinite(loc.coords.accuracy)
          ? loc.coords.accuracy
          : undefined,
      speed: loc.coords.speed ?? undefined,
      heading: loc.coords.heading ?? undefined,
      source,
    },
  });
}

async function handleLocation(loc: Location.LocationObject): Promise<void> {
  if (!active) return;
  const a = active;

  // 1) START ping 한 번만
  if (!a.startedSent) {
    a.startedSent = true;
    void sendPing(a.tripId, loc, "START").catch((e) =>
      console.warn("START ping failed:", e),
    );
  }

  // 2) STOP_PASS 자동 판정
  for (const s of a.stops) {
    if (a.passed.has(s.id)) continue;
    const d = haversineMeters(
      loc.coords.latitude,
      loc.coords.longitude,
      s.lat,
      s.lng,
    );
    if (d <= s.radiusM) {
      a.passed.add(s.id);
      a.onStopPassed?.(s.id);
      void sendPing(a.tripId, loc, "STOP_PASS").catch((e) =>
        console.warn("STOP_PASS ping failed:", e),
      );
    }
  }

  const now = Date.now();
  const payload = pingPayloadFromLocation(loc);
  a.onLocation?.(payload);

  // 3) 5초 throttle broadcast
  if (
    a.channelReady &&
    a.channel &&
    now - a.lastBroadcast >= BROADCAST_INTERVAL_MS
  ) {
    a.lastBroadcast = now;
    a.channel
      .send({
        type: "broadcast",
        event: TRIP_PING_EVENT,
        payload,
      })
      .catch((e) => console.warn("broadcast failed:", e));
  }

  // 4) 30초 INTERVAL DB ping
  if (now - a.lastDb >= DB_INTERVAL_MS) {
    a.lastDb = now;
    void sendPing(a.tripId, loc, "INTERVAL").catch((e) =>
      console.warn("INTERVAL ping failed:", e),
    );
  }
}

// TaskManager.defineTask는 *지연 등록* (W23-E 1.0.2 수술 — 흰 화면 회피).
// 원래 module-level이었지만 expo-task-manager native 모듈 init 실패 시
// 앱 entry 첫 import 단계에서 throw → JS 번들 로드 실패 → 흰 화면이 됐을 가능성.
// startGps 첫 호출 시점으로 이동해 root mount 영향 제거.
type LocationTaskData = { locations?: Location.LocationObject[] };
let _taskRegistered = false;
function ensureLocationTaskRegistered(): void {
  if (_taskRegistered) return;
  _taskRegistered = true;
  TaskManager.defineTask<LocationTaskData>(LOCATION_TASK, async (body) => {
    if (body.error) {
      console.warn("location task error:", body.error);
      active?.onError?.("위치 추적 오류가 발생했어요");
      return;
    }
    const locations = body.data?.locations ?? [];
    for (const loc of locations) {
      await handleLocation(loc).catch((e) =>
        console.warn("handleLocation:", e),
      );
    }
  });
}

async function ensureChannel(tripId: string): Promise<RealtimeChannel> {
  const ch = supabase.channel(tripChannelName(tripId), {
    config: { broadcast: { self: true } },
  });
  await new Promise<void>((resolve) => {
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
    });
  });
  return ch;
}

export async function startGps(opts: {
  tripId: string;
  stops: GpsStop[];
  onStopPassed?: (stopId: string) => void;
  onLocation?: (loc: TripPingPayload) => void;
  onError?: (msg: string) => void;
}): Promise<void> {
  if (active) return;

  // module-level에서 옮겨온 lazy 등록 — 첫 startGps 호출에만 실제 native 호출.
  ensureLocationTaskRegistered();

  // 권한 확인 — foreground 먼저, 그 다음 background
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") {
    opts.onError?.(
      "위치 권한이 거부됐어요. 시스템 설정에서 위치 사용을 허용해 주세요",
    );
    return;
  }
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== "granted") {
    opts.onError?.(
      "백그라운드 위치 권한이 필요합니다. 시스템 설정 → 권한 → 위치 → '항상 허용'을 선택해 주세요",
    );
    return;
  }

  active = {
    tripId: opts.tripId,
    stops: opts.stops,
    onStopPassed: opts.onStopPassed,
    onLocation: opts.onLocation,
    onError: opts.onError,
    startedSent: false,
    passed: new Set(),
    lastBroadcast: 0,
    lastDb: 0,
    channel: null,
    channelReady: false,
  };

  // Supabase Realtime 채널 미리 구독 (broadcast publish 준비)
  try {
    const ch = await ensureChannel(opts.tripId);
    if (active) {
      active.channel = ch;
      active.channelReady = true;
    }
  } catch (e) {
    console.warn("channel subscribe failed:", e);
    // 채널 실패해도 GPS 시작은 진행 — DB ping은 동작
  }

  // 이미 다른 task 돌고 있으면 정리
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
    if (running) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  } catch {
    // ignore
  }

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 5_000,
    distanceInterval: 0,
    deferredUpdatesInterval: 5_000,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "운행 중 — 위치 송신",
      notificationBody:
        "셔틀이 기사 앱이 위치를 학부모에게 실시간 전달하고 있어요",
      notificationColor: "#facc15",
    },
  });
}

export async function stopGps(): Promise<void> {
  if (!active) return;
  const a = active;
  active = null;

  // END ping — 마지막 좌표 있으면
  try {
    const last = await Location.getLastKnownPositionAsync();
    if (last) {
      await sendPing(a.tripId, last, "END").catch(() => {});
    }
  } catch {
    // ignore
  }

  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
    if (isRunning) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  } catch (e) {
    console.warn("stopLocationUpdates failed:", e);
  }

  if (a.channel) {
    void supabase.removeChannel(a.channel);
  }
}
