// POST /api/driver/notifications/[id]/read — 알림 1건 읽음 처리.
// driver/helper 둘 다 가능.

import { NextResponse, type NextRequest } from "next/server";

import { apiError, requireApiRole } from "@/lib/auth/api-guard";
import { markNotificationRead } from "@/server/driver/mark-notification-read";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiRole(["DRIVER", "HELPER"]);
  if (!guard.ok) return guard.response;
  const { id } = await params;

  try {
    await markNotificationRead(guard.user, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
