// GET /api/driver/me — 기사 RN 앱 헤더용 메타 정보.
// 학원명·이름·역할·이메일 + 안 읽은 알림 수.

import { NextResponse } from "next/server";

import { requireApiRole } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";

export async function GET() {
  const guard = await requireApiRole(["DRIVER"]);
  if (!guard.ok) return guard.response;

  const unreadCount = await db.notification.count({
    where: { userId: guard.user.authUserId, readAt: null },
  });

  return NextResponse.json({
    orgName: guard.user.org.name,
    staffName: guard.user.staff.name,
    role: guard.user.staff.role,
    email: guard.user.email,
    unreadCount,
  });
}
