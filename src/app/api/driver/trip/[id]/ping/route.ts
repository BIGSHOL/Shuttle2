// POST /api/driver/trip/[id]/ping — LocationPing 영구 저장.
// 5초 broadcast(실시간)는 RN이 직접 Supabase channel.send. 이건 30초 간격
// + STOP_PASS + START + END만 호출.

import { NextResponse, type NextRequest } from "next/server";

import { apiError, requireApiRole } from "@/lib/auth/api-guard";
import { recordPing } from "@/server/driver/record-ping";
import { PingInputSchema } from "@/server/driver/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiRole(["DRIVER"]);
  if (!guard.ok) return guard.response;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  // path의 tripId가 body의 tripId보다 우선 (RN 클라이언트 실수 방지)
  const parsed = PingInputSchema.safeParse({ ...body, tripId: id });
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    await recordPing(guard.user, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
