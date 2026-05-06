// POST   /api/driver/push-subscription — Web Push 구독 저장.
// DELETE /api/driver/push-subscription — Web Push 구독 해제 (body: { endpoint }).
//
// 향후 Day 8에서 FCM 토큰도 같은 endpoint에 통합 가능 (body의 kind 분기).
// 지금은 Web Push 전용. RN 앱은 Day 8까지 푸시 토큰 등록 안 함.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { apiError, requireApiRole } from "@/lib/auth/api-guard";
import { removeDriverPushSubscription } from "@/server/driver/remove-push-subscription";
import { saveDriverPushSubscription } from "@/server/driver/save-push-subscription";
import { PushSubscribeInputSchema } from "@/server/driver/types";

export async function POST(request: NextRequest) {
  const guard = await requireApiRole(["DRIVER"]);
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = PushSubscribeInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    await saveDriverPushSubscription(guard.user, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}

const DeleteBodySchema = z.object({ endpoint: z.string().url() });

export async function DELETE(request: NextRequest) {
  const guard = await requireApiRole(["DRIVER"]);
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = DeleteBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    await removeDriverPushSubscription(guard.user, parsed.data.endpoint);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
