// POST /api/driver/trip/[id]/manual-stop-pass — 정류장 수기 "도착" 마킹.
// GPS 자동 감지 안 됐을 때 RN 앱·PWA 모두 호출. body: { stopId }

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { apiError, requireApiRole } from "@/lib/auth/api-guard";
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
    await markStopPassed(guard.user, id, parsed.data.stopId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
