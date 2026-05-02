import { haversineMeters } from "./distance";

// ETA 단순 추정.
// 현재 셔틀 위치 → 목표 정류장까지 직선거리 ÷ 평균 25km/h.
// 도심 셔틀 평균 속도 기준 (W4-2 MVP). 카카오맵 길찾기 API 본격 연동은 W6+.
const AVG_SPEED_KMH = 25;

export function estimateEtaMinutes(
  current: { lat: number; lng: number },
  target: { lat: number; lng: number },
): number {
  const meters = haversineMeters(
    current.lat,
    current.lng,
    target.lat,
    target.lng,
  );
  const km = meters / 1000;
  const hours = km / AVG_SPEED_KMH;
  const minutes = hours * 60;
  // 1분 미만이어도 "곧 도착"으로 보이게 최소 1분.
  return Math.max(1, Math.round(minutes));
}
