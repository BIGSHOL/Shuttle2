// POST /api/driver/trip/[id]/safety — KIDS 안전점검 upsert.
// driver/helper 둘 다 토글 가능.

import { NextResponse, type NextRequest } from "next/server";

import { apiError, requireApiRole } from "@/lib/auth/api-guard";
import { SafetyFieldsInputSchema } from "@/server/driver/types";
import { upsertSafetyCheck } from "@/server/driver/upsert-safety-check";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiRole(["DRIVER", "HELPER"]);
  if (!guard.ok) return guard.response;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = SafetyFieldsInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    await upsertSafetyCheck(guard.user, id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
