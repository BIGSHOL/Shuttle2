// GET /api/driver/trip/[id] — 운행 진행 화면용 trip 상세.
// driver/helper 둘 다 가능.

import { NextResponse, type NextRequest } from "next/server";

import { apiError, requireApiRole } from "@/lib/auth/api-guard";
import { getTripDetail } from "@/server/driver/get-trip-detail";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiRole(["DRIVER", "HELPER"]);
  if (!guard.ok) return guard.response;
  const { id } = await params;

  try {
    const detail = await getTripDetail(guard.user, id);
    return NextResponse.json(detail);
  } catch (e) {
    return apiError(e);
  }
}
