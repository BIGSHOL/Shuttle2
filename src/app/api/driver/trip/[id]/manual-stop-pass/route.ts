// POST /api/driver/trip/[id]/manual-stop-pass — 정류장 수기 "도착" 마킹.
// GPS 자동 감지 안 됐을 때 RN 앱 호출. body: { stopId } (Stop.id).
//
// PWA의 server action(markStopPassedAction)은 RouteStop.id를 받지만, 이 RN
// endpoint는 backward-compat으로 Stop.id를 받는다. 같은 trip의 routeId 안에서
// stopId → RouteStop.id 변환 후 markStopPassed 호출.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { apiError, requireApiRole } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { markStopPassed } from "@/server/driver/mark-stop-passed";

const BodySchema = z.object({ stopId: z.string().min(1) });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiRole(["DRIVER"]);
  if (!guard.ok) return guard.response;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    // Stop.id → RouteStop.id 변환. 본인 trip의 routeId로 제한.
    const trip = await db.trip.findFirst({
      where: {
        id,
        driverId: guard.user.staff.id,
        vehicle: { orgId: guard.user.org.id },
      },
      select: { routeId: true },
    });
    if (!trip) {
      return NextResponse.json(
        { error: "TRIP_NOT_FOUND" },
        { status: 404 },
      );
    }
    const routeStop = await db.routeStop.findFirst({
      where: { routeId: trip.routeId, stopId: parsed.data.stopId },
      select: { id: true },
    });
    if (!routeStop) {
      return NextResponse.json(
        { error: "STOP_NOT_ON_ROUTE" },
        { status: 400 },
      );
    }

    await markStopPassed(guard.user, id, routeStop.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
