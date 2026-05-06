// POST /api/driver/trip/[id]/end — 운행 종료 (RN 앱).

import { NextResponse, type NextRequest } from "next/server";

import { apiError, requireApiRole } from "@/lib/auth/api-guard";
import { endTrip } from "@/server/driver/end-trip";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiRole(["DRIVER"]);
  if (!guard.ok) return guard.response;
  const { id } = await params;

  try {
    await endTrip(guard.user, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
