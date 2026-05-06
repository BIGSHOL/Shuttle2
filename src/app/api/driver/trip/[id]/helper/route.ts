// PUT /api/driver/trip/[id]/helper — Trip 동승자 지정/해제 (driver only).
// body: { helperId: string | null }

import { NextResponse, type NextRequest } from "next/server";

import { apiError, requireApiRole } from "@/lib/auth/api-guard";
import { assignHelper } from "@/server/driver/assign-helper";
import { AssignHelperInputSchema } from "@/server/driver/types";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiRole(["DRIVER"]);
  if (!guard.ok) return guard.response;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = AssignHelperInputSchema.safeParse({ ...body, tripId: id });
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    await assignHelper(guard.user, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
