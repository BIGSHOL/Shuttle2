import "server-only";

import type { Prisma } from "@/generated/prisma/client";

import { db } from "@/lib/db";

// W24: 매니저 작업 audit log helper.
// 모든 admin server action 마지막에 호출 (실패해도 throw 안 함 — log 실패가
// 본 작업을 막지 않게).

type AuditPayload = {
  actorEmail: string;
  action: string;
  targetOrgId?: string | null;
  targetUserId?: string | null;
  // Prisma InputJsonValue 호환 — primitive·object·array 모두 허용.
  payload?: Prisma.InputJsonValue;
};

export async function writeAuditLog(input: AuditPayload): Promise<void> {
  try {
    await db.adminAuditLog.create({
      data: {
        actorEmail: input.actorEmail,
        action: input.action,
        targetOrgId: input.targetOrgId ?? null,
        targetUserId: input.targetUserId ?? null,
        // payload가 없으면 그냥 컬럼을 비워둔다 (undefined → 자동 NULL).
        ...(input.payload !== undefined ? { payload: input.payload } : {}),
      },
    });
  } catch (err) {
    console.error("[audit] failed to write log", err);
  }
}
