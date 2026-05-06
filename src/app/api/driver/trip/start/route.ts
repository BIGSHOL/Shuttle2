// POST /api/driver/trip/start — 운행 시작 (RN 앱).
// SA 호환: src/app/(driver)/run/actions.ts의 startTripAction과 동일 로직.

import { NextResponse, type NextRequest } from "next/server";

import { apiError, requireApiRole } from "@/lib/auth/api-guard";
import { startTrip } from "@/server/driver/start-trip";
import { StartTripInputSchema } from "@/server/driver/types";

export async function POST(request: NextRequest) {
  const guard = await requireApiRole(["DRIVER"]);
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = StartTripInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    const result = await startTrip(guard.user, parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    return apiError(e);
  }
}
