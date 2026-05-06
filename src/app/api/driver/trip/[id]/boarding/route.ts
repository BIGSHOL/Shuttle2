// POST /api/driver/trip/[id]/boarding — BoardingEvent toggle (BOARD/ALIGHT).
// driver/helper 둘 다 가능.

import { NextResponse, type NextRequest } from "next/server";

import { apiError, requireApiRole } from "@/lib/auth/api-guard";
import { toggleBoardingEvent } from "@/server/driver/toggle-boarding-event";
import { BoardingInputSchema } from "@/server/driver/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiRole(["DRIVER", "HELPER"]);
  if (!guard.ok) return guard.response;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = BoardingInputSchema.safeParse({ ...body, tripId: id });
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    await toggleBoardingEvent(guard.user, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
