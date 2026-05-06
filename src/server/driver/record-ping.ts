// LocationPing 영구 저장 + STOP_PASS 시점 학부모 푸시.
//
// 영구 저장 정책 (CLAUDE.md 명세):
// - 30초 간격 INTERVAL ping
// - 정류장 반경 진입 시점 STOP_PASS ping (자동 판정)
// - 운행 시작 시점 START ping
// - 운행 종료 시점 END ping
// 실시간 broadcast (5초 간격)는 클라이언트가 직접 Supabase channel.send,
// DB 거치지 않음.

import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";
import { haversineMeters } from "@/lib/geo/distance";
import { sendToGuardian } from "@/lib/push/server";

import type { PingInput } from "./types";

const STOP_MATCH_RADIUS_M = 200; // 매칭 임계값

export async function recordPing(
  actor: CurrentUser,
  input: PingInput,
): Promise<void> {
  const orgId = actor.org.id;

  // 진행 중 trip + 본인이 driver 검증
  const trip = await db.trip.findFirst({
    where: {
      id: input.tripId,
      driverId: actor.staff.id,
      vehicle: { orgId },
    },
    select: { id: true, routeId: true, endedAt: true, startLat: true },
  });
  if (!trip) throw new Error("운행을 찾을 수 없습니다");
  if (trip.endedAt) {
    throw new Error("종료된 운행에는 좌표를 기록할 수 없습니다");
  }

  await db.locationPing.create({
    data: {
      tripId: input.tripId,
      lat: input.lat,
      lng: input.lng,
      accuracy: input.accuracy ?? null,
      speed: input.speed ?? null,
      heading: input.heading ?? null,
      source: input.source,
    },
  });

  // 첫 START ping이면 trip.startLat/Lng도 채움
  if (input.source === "START" && trip.startLat === null) {
    await db.trip.update({
      where: { id: trip.id },
      data: { startLat: input.lat, startLng: input.lng },
    });
  }
  // END ping이면 trip.endLat/Lng도 채움
  if (input.source === "END") {
    await db.trip.update({
      where: { id: trip.id },
      data: { endLat: input.lat, endLng: input.lng },
    });
  }

  // STOP_PASS: 가장 가까운 RouteStop 매칭 → 그 stop을 정류장으로 가진
  // 자녀들의 학부모에게 push. 클라이언트가 같은 stop 1번만 보내므로 서버
  // 측 중복 차단 불필요.
  if (input.source === "STOP_PASS") {
    await notifyGuardiansOfStopPass(trip.routeId, input.lat, input.lng).catch(
      (e) => console.warn("stop-pass push failed:", e),
    );
  }
}

async function notifyGuardiansOfStopPass(
  routeId: string,
  lat: number,
  lng: number,
): Promise<void> {
  const stops = await db.routeStop.findMany({
    where: { routeId },
    include: {
      stop: { select: { id: true, name: true, lat: true, lng: true } },
    },
  });

  let bestStopId: string | null = null;
  let bestName = "";
  let bestDist = Infinity;
  for (const rs of stops) {
    const d = haversineMeters(lat, lng, rs.stop.lat, rs.stop.lng);
    if (d < bestDist) {
      bestDist = d;
      bestStopId = rs.stop.id;
      bestName = rs.stop.name;
    }
  }
  if (!bestStopId || bestDist > STOP_MATCH_RADIUS_M) return;

  // 이 stop을 자기 stop으로 가진 학생 + 그들의 보호자
  const links = await db.guardianLink.findMany({
    where: {
      student: { routes: { some: { stopId: bestStopId, routeId } } },
    },
    select: {
      guardianId: true,
      student: { select: { name: true } },
    },
  });

  if (links.length === 0) return;

  // 같은 guardian이 여러 자녀를 가질 수 있어 dedupe
  const byGuardian = new Map<string, string[]>();
  for (const l of links) {
    const arr = byGuardian.get(l.guardianId) ?? [];
    if (!arr.includes(l.student.name)) arr.push(l.student.name);
    byGuardian.set(l.guardianId, arr);
  }

  await Promise.all(
    Array.from(byGuardian.entries()).map(([gid, names]) =>
      sendToGuardian(gid, {
        title: "셔틀 도착",
        body: `${names.join(", ")} 자녀의 정류장 (${bestName})에 셔틀이 도착했어요.`,
        url: "/home",
        category: "SHUTTLE_NEAR_CHILD",
      }),
    ),
  );
}
