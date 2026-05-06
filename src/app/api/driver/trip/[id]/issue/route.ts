// POST   /api/driver/trip/[id]/issue — 미탑승·미하차 mark (NO_SHOW/NO_DROPOFF).
// DELETE /api/driver/trip/[id]/issue — 같은 mark 해제.
// driver/helper 둘 다 가능.

import { NextResponse, type NextRequest } from "next/server";

import { apiError, requireApiRole } from "@/lib/auth/api-guard";
import { markBoardingIssue } from "@/server/driver/mark-boarding-issue";
import {
  MarkIssueInputSchema,
  UnmarkIssueInputSchema,
} from "@/server/driver/types";
import { unmarkBoardingIssue } from "@/server/driver/unmark-boarding-issue";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiRole(["DRIVER", "HELPER"]);
  if (!guard.ok) return guard.response;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = MarkIssueInputSchema.safeParse({ ...body, tripId: id });
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    await markBoardingIssue(guard.user, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiRole(["DRIVER", "HELPER"]);
  if (!guard.ok) return guard.response;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = UnmarkIssueInputSchema.safeParse({ ...body, tripId: id });
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    await unmarkBoardingIssue(guard.user, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
