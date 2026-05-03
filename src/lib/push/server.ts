import "server-only";

import webpush, { type PushSubscription } from "web-push";

import type { NotificationCategory } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

// VAPID 키가 설정돼 있을 때만 web-push 발송. 없으면 push 부분만 no-op.
// DB Notification은 항상 미러 생성 (W10).
let configured = false;
function configurePush(): boolean {
  if (configured) return true;
  if (!env.VAPID_PRIVATE_KEY || !env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    return false;
  }
  webpush.setVapidDetails(
    env.VAPID_SUBJECT ?? "mailto:noreply@example.com",
    env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  );
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  category: NotificationCategory; // W10: DB Notification 미러용
};

type StoredSub = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

async function sendOne(
  sub: StoredSub,
  payload: PushPayload,
): Promise<{ ok: boolean; gone: boolean }> {
  const sdkSub: PushSubscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };
  try {
    // service worker가 받을 페이로드 — title/body/url만 전달 (category는 DB용)
    await webpush.sendNotification(
      sdkSub,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url,
      }),
    );
    return { ok: true, gone: false };
  } catch (err: unknown) {
    const status =
      typeof err === "object" && err !== null && "statusCode" in err
        ? Number((err as { statusCode: unknown }).statusCode)
        : 0;
    if (status === 404 || status === 410) {
      return { ok: false, gone: true };
    }
    console.warn("push send failed:", status, err);
    return { ok: false, gone: false };
  }
}

// DB Notification 미러 생성. push 권한 없거나 실패해도 인앱에서 확인 가능.
async function createDbNotifications(
  userIds: string[],
  payload: PushPayload,
): Promise<void> {
  if (userIds.length === 0) return;
  await db.notification
    .createMany({
      data: userIds.map((userId) => ({
        userId,
        category: payload.category,
        title: payload.title,
        body: payload.body,
        url: payload.url ?? null,
      })),
    })
    .catch((e) => console.warn("notification mirror failed:", e));
}

// 학부모(Guardian) 한 명에게 — Push fan-out + DB Notification 1건.
export async function sendToGuardian(
  guardianId: string,
  payload: PushPayload,
): Promise<{ sent: number; pruned: number }> {
  // DB Notification은 push 설정과 무관하게 항상 mirror.
  const guardian = await db.guardian.findUnique({
    where: { id: guardianId },
    select: { userId: true },
  });
  if (guardian?.userId) {
    await createDbNotifications([guardian.userId], payload);
  }

  if (!configurePush()) return { sent: 0, pruned: 0 };

  const subs = await db.pushSubscription.findMany({
    where: { guardianId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  if (subs.length === 0) return { sent: 0, pruned: 0 };

  const results = await Promise.all(subs.map((s) => sendOne(s, payload)));
  const goneIds = subs.filter((_, i) => results[i].gone).map((s) => s.id);
  if (goneIds.length > 0) {
    await db.pushSubscription
      .deleteMany({ where: { id: { in: goneIds } } })
      .catch(() => {});
  }

  return {
    sent: results.filter((r) => r.ok).length,
    pruned: goneIds.length,
  };
}

// Staff 한 명에게.
export async function sendToStaff(
  staffId: string,
  payload: PushPayload,
): Promise<{ sent: number; pruned: number }> {
  const staff = await db.staff.findUnique({
    where: { id: staffId },
    select: { userId: true },
  });
  if (staff?.userId) {
    await createDbNotifications([staff.userId], payload);
  }

  if (!configurePush()) return { sent: 0, pruned: 0 };

  const subs = await db.staffPushSubscription.findMany({
    where: { staffId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  if (subs.length === 0) return { sent: 0, pruned: 0 };

  const results = await Promise.all(subs.map((s) => sendOne(s, payload)));
  const goneIds = subs.filter((_, i) => results[i].gone).map((s) => s.id);
  if (goneIds.length > 0) {
    await db.staffPushSubscription
      .deleteMany({ where: { id: { in: goneIds } } })
      .catch(() => {});
  }

  return {
    sent: results.filter((r) => r.ok).length,
    pruned: goneIds.length,
  };
}

// org의 모든 OWNER에게 fan-out (결석 신청, 정류장 변경 요청 알림).
export async function sendToOwnersOfOrg(
  orgId: string,
  payload: PushPayload,
): Promise<{ sent: number; pruned: number }> {
  const owners = await db.staff.findMany({
    where: { orgId, role: "OWNER" },
    select: { id: true, userId: true },
  });

  // DB 미러 (push 설정과 무관)
  const userIds = owners
    .map((o) => o.userId)
    .filter((id): id is string => id !== null);
  if (userIds.length > 0) {
    await createDbNotifications(userIds, payload);
  }

  if (!configurePush()) return { sent: 0, pruned: 0 };

  let sent = 0;
  let pruned = 0;
  // sendToStaff는 다시 DB mirror를 시도하므로 push만 보내는 inner 호출 별도 필요 —
  // 단순화 위해 DB는 위에서 한 번만 처리, push는 직접 fan-out.
  for (const o of owners) {
    const subs = await db.staffPushSubscription.findMany({
      where: { staffId: o.id },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    if (subs.length === 0) continue;
    const results = await Promise.all(subs.map((s) => sendOne(s, payload)));
    const goneIds = subs.filter((_, i) => results[i].gone).map((s) => s.id);
    if (goneIds.length > 0) {
      await db.staffPushSubscription
        .deleteMany({ where: { id: { in: goneIds } } })
        .catch(() => {});
    }
    sent += results.filter((r) => r.ok).length;
    pruned += goneIds.length;
  }
  return { sent, pruned };
}
