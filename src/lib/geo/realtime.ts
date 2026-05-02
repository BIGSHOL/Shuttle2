// Supabase Realtime broadcast 채널. trip:<tripId> 채널에 ping payload를
// 보내면 같은 채널을 구독한 학부모 앱이 즉시 받는다. DB 거치지 않음.
// 학부모 측 구독은 W4에서.

export const TRIP_CHANNEL_PREFIX = "trip";
export const TRIP_PING_EVENT = "ping";

export function tripChannelName(tripId: string): string {
  return `${TRIP_CHANNEL_PREFIX}:${tripId}`;
}

export type TripPingPayload = {
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  recordedAt: string; // ISO8601
};
