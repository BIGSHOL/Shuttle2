import "server-only";

import { env } from "@/lib/env";

import {
  TRIP_UPDATE_EVENT,
  orgTripsChannelName,
  tripChannelName,
  type TripUpdatePayload,
  type TripUpdateReason,
} from "./realtime";

// Supabase Realtime broadcast HTTP 엔드포인트.
// channel.subscribe → channel.send 흐름은 서버에서 매번 250~500ms 들어 무거우므로
// HTTP API로 fire-and-forget. 실패해도 throw하지 않는다 — server action은
// 이미 revalidatePath를 호출하므로 학원장이 새로고침하면 어쨌든 최신 데이터를 본다.
// (주의) 이 엔드포인트는 Supabase Realtime이 활성화돼 있어야 동작한다.
// RLS 활성 상태에서도 anon key로 broadcast 송신은 허용 (수신만 RLS 검증).
const HTTP_BROADCAST_TIMEOUT_MS = 2_000;

export async function publishTripUpdate(
  tripId: string,
  reason: TripUpdateReason,
  orgId?: string,
): Promise<void> {
  const payload: TripUpdatePayload = {
    tripId,
    reason,
    at: new Date().toISOString(),
  };

  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`;
  const apikey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 두 채널에 동시 발행 — trip 상세 화면용(trip:<tripId>) + org 대시보드용(org-trips:<orgId>).
  // orgId가 없으면 trip 채널만. 한 번의 HTTP로 multi-message body.
  const messages: Array<{
    topic: string;
    event: string;
    payload: TripUpdatePayload;
    private: boolean;
  }> = [
    {
      topic: tripChannelName(tripId),
      event: TRIP_UPDATE_EVENT,
      payload,
      private: false,
    },
  ];
  if (orgId) {
    messages.push({
      topic: orgTripsChannelName(orgId),
      event: TRIP_UPDATE_EVENT,
      payload,
      private: false,
    });
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        apikey,
        Authorization: `Bearer ${apikey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
      signal: AbortSignal.timeout(HTTP_BROADCAST_TIMEOUT_MS),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(
        `[publishTripUpdate] broadcast failed (${reason}): ${res.status} ${body}`,
      );
    }
  } catch (e) {
    // Broadcast 실패는 swallow — revalidatePath fallback이 이미 있다.
    console.warn(`[publishTripUpdate] broadcast error (${reason}):`, e);
  }
}
