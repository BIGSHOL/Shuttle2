import "server-only";

import { env } from "@/lib/env";

// 카카오 모빌리티 길찾기 API. REST API 키 필요 (JS 키와 다름).
// 무료: 일 5천 건. 학부모 ETA에 30초 throttle로 사용.
// 응답 spec: https://developers.kakao.com/docs/latest/ko/kakaonavi/rest-api

const KAKAO_NAVI_URL = "https://apis-navi.kakaomobility.com/v1/directions";

export type KakaoRouteResult = {
  durationSec: number;
  distanceM: number;
};

export async function fetchKakaoRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<KakaoRouteResult | null> {
  if (!env.KAKAO_REST_API_KEY) return null;

  // origin·destination 형식: "lng,lat" 문자열
  const origin = `${from.lng},${from.lat}`;
  const destination = `${to.lng},${to.lat}`;
  const url = `${KAKAO_NAVI_URL}?origin=${encodeURIComponent(
    origin,
  )}&destination=${encodeURIComponent(destination)}&priority=RECOMMEND`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${env.KAKAO_REST_API_KEY}` },
      // 동일 요청에 한해 30초간 캐시 — 학부모 다수가 보더라도 quota 절약
      next: { revalidate: 30 },
    });
  } catch (err) {
    console.warn("kakao routing fetch failed:", err);
    return null;
  }

  if (!res.ok) {
    console.warn("kakao routing non-ok:", res.status);
    return null;
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return null;
  }

  // 응답 구조: { routes: [{ summary: { duration: 초, distance: m }, ... }] }
  const route =
    typeof json === "object" && json !== null
      ? (json as { routes?: unknown }).routes
      : undefined;
  if (!Array.isArray(route) || route.length === 0) return null;
  const summary =
    typeof route[0] === "object" && route[0] !== null
      ? (route[0] as { summary?: unknown }).summary
      : undefined;
  if (typeof summary !== "object" || summary === null) return null;

  const s = summary as { duration?: unknown; distance?: unknown };
  const duration = Number(s.duration);
  const distance = Number(s.distance);
  if (!Number.isFinite(duration) || !Number.isFinite(distance)) return null;

  return { durationSec: duration, distanceM: distance };
}
