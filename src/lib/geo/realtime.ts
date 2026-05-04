// Supabase Realtime broadcast 채널. trip:<tripId> 채널에 ping payload를
// 보내면 같은 채널을 구독한 학부모 앱이 즉시 받는다. DB 거치지 않음.
// 학부모 측 구독은 W4에서.
//
// W16: 같은 채널에 "update" 이벤트를 추가. 기사 측 서버 액션이 BoardingEvent /
// SafetyCheck / Trip state 변동 직후 broadcast → 학원장 화면이 router.refresh로
// 즉시 다시 그린다. 다른 이벤트(ping)와 섞여도 event 이름으로 분기되므로 안전.

export const TRIP_CHANNEL_PREFIX = "trip";
export const TRIP_PING_EVENT = "ping";
export const TRIP_UPDATE_EVENT = "update";

// W16-D: org 단위 채널. 학원장 dashboard가 trip 여러 개를 동시에 보므로
// trip:<tripId> 여러 개를 구독하는 대신 org-trips:<orgId> 1개만 구독.
// 같은 update payload(tripId 포함)를 함께 수신해 router.refresh.
export const ORG_TRIPS_CHANNEL_PREFIX = "org-trips";

export function tripChannelName(tripId: string): string {
  return `${TRIP_CHANNEL_PREFIX}:${tripId}`;
}

export function orgTripsChannelName(orgId: string): string {
  return `${ORG_TRIPS_CHANNEL_PREFIX}:${orgId}`;
}

export type TripPingPayload = {
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  recordedAt: string; // ISO8601
};

// W16: 운행 상세 화면(학원장·기사·동승자)에서 자동 갱신 트리거용.
// reason은 디버깅·UI 표시(어느 변동인지)에 쓰고, refetch 자체는 reason 무관하게 한다.
export type TripUpdateReason =
  | "boarding" // BOARD/ALIGHT toggled
  | "issue" // NO_SHOW/NO_DROPOFF marked·해제
  | "safety" // SafetyCheck upserted
  | "trip-state"; // start/end/helper 배정

export type TripUpdatePayload = {
  tripId: string;
  reason: TripUpdateReason;
  at: string; // ISO8601
};
