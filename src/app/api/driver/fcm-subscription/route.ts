// POST   /api/driver/fcm-subscription — 기사 RN 앱 FCM 토큰 등록.
// DELETE /api/driver/fcm-subscription — 토큰 해제 (body: { fcmToken }).

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { FcmSubscribeInputSchema } from "@shuttlee/shared-contracts";

import { apiError, requireApiRole } from "@/lib/auth/api-guard";
import { removeDriverFcmSubscription } from "@/server/driver/remove-fcm-subscription";
import { saveDriverFcmSubscription } from "@/server/driver/save-fcm-subscription";

export async function POST(request: NextRequest) {
  const guard = await requireApiRole(["DRIVER"]);
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = FcmSubscribeInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    await saveDriverFcmSubscription(guard.user, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}

const DeleteBodySchema = z.object({ fcmToken: z.string().min(1) });

export async function DELETE(request: NextRequest) {
  const guard = await requireApiRole(["DRIVER"]);
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = DeleteBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    await removeDriverFcmSubscription(guard.user, parsed.data.fcmToken);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
