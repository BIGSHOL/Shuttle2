import { type NextRequest, NextResponse } from "next/server";

import { requireGuardian } from "@/lib/auth/session";
import { estimateEtaMinutes } from "@/lib/geo/eta";
import { fetchKakaoRoute } from "@/lib/map/kakao-routing";

// 학부모 trip-live 화면이 30초 throttle로 호출하는 ETA endpoint.
// 카카오 길찾기 키가 없으면 직선거리 폴백 — 두 경우 모두 같은 응답 형식.
// 권한: 학부모 로그인만 (특정 trip 자녀 검증은 안 함 — ETA query는 좌표만
// 받고 민감 정보 노출 없음).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(req: NextRequest) {
  // 학부모 로그인 검증 — 익명 호출은 차단
  await requireGuardian();

  const sp = req.nextUrl.searchParams;
  const fromLat = Number(sp.get("fromLat"));
  const fromLng = Number(sp.get("fromLng"));
  const toLat = Number(sp.get("toLat"));
  const toLng = Number(sp.get("toLng"));

  if (
    !Number.isFinite(fromLat) ||
    !Number.isFinite(fromLng) ||
    !Number.isFinite(toLat) ||
    !Number.isFinite(toLng)
  ) {
    return bad("좌표가 올바르지 않습니다");
  }

  const from = { lat: fromLat, lng: fromLng };
  const to = { lat: toLat, lng: toLng };

  // 1) 카카오 길찾기 시도
  const kakao = await fetchKakaoRoute(from, to);
  if (kakao) {
    return NextResponse.json({
      source: "kakao",
      durationSec: kakao.durationSec,
      distanceM: kakao.distanceM,
      etaMinutes: Math.max(1, Math.round(kakao.durationSec / 60)),
    });
  }

  // 2) 폴백: 직선거리 + 평균 25km/h
  const etaMin = estimateEtaMinutes(from, to);
  return NextResponse.json({
    source: "haversine",
    durationSec: etaMin * 60,
    distanceM: null,
    etaMinutes: etaMin,
  });
}
