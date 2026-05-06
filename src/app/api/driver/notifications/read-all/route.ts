// POST /api/driver/notifications/read-all — 본인 모든 미읽음 알림 처리.

import { NextResponse } from "next/server";

import { apiError, requireApiRole } from "@/lib/auth/api-guard";
import { markAllNotificationsRead } from "@/server/driver/mark-all-notifications-read";

export async function POST() {
  const guard = await requireApiRole(["DRIVER", "HELPER"]);
  if (!guard.ok) return guard.response;

  try {
    await markAllNotificationsRead(guard.user);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
