// GET /api/driver/notifications — 본인 인앱 알림 목록.
// driver/helper 둘 다.

import { NextResponse } from "next/server";

import { requireApiRole } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";

export async function GET() {
  const guard = await requireApiRole(["DRIVER", "HELPER"]);
  if (!guard.ok) return guard.response;

  const list = await db.notification.findMany({
    where: { userId: guard.user.authUserId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      category: true,
      title: true,
      body: true,
      url: true,
      readAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    notifications: list.map((n) => ({
      id: n.id,
      category: n.category,
      title: n.title,
      body: n.body,
      url: n.url,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}
