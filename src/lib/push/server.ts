import "server-only";

import webpush, { type PushSubscription } from "web-push";

import type { NotificationCategory } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

import { sendOneFcm } from "./fcm";

// VAPID 키가 설정돼 있을 때만 web-push 발송. 없으면 push 부분만 no-op.
// DB Notification은 항상 미러 생성 (W10).
//
// W23: FCM 추가 — 기사용 RN 앱(안드로이드 사이드로드 APK).
// sendToStaff / sendToOwnersOfOrg가 web-push와 FCM 양쪽으로 fan-out.
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
// (학부모는 Web Push만 — RN 앱이 없음.)
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

// W23: Staff에 대한 Web Push fan-out (기존 로직만 추출).
async function sendWebPushToStaff(
  staffId: string,
  payload: PushPayload,
): Promise<{ sent: number; pruned: number }> {
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

// W23: Staff에 대한 FCM fan-out (RN 앱).
async function sendFcmToStaff(
  staffId: string,
  payload: PushPayload,
): Promise<{ sent: number; pruned: number }> {
  const subs = await db.staffFcmSubscription.findMany({
    where: { staffId },
    select: { id: true, fcmToken: true },
  });
  if (subs.length === 0) return { sent: 0, pruned: 0 };

  const results = await Promise.all(
    subs.map((s) => sendOneFcm(s.fcmToken, payload)),
  );
  const goneIds = subs.filter((_, i) => results[i].gone).map((s) => s.id);
  if (goneIds.length > 0) {
    await db.staffFcmSubscription
      .deleteMany({ where: { id: { in: goneIds } } })
      .catch(() => {});
  }

  return {
    sent: results.filter((r) => r.ok).length,
    pruned: goneIds.length,
  };
}

// Staff 한 명에게.
// W23: web-push + FCM 양쪽으로 fan-out.
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

  const [webResult, fcmResult] = await Promise.all([
    sendWebPushToStaff(staffId, payload),
    sendFcmToStaff(staffId, payload),
  ]);

  return {
    sent: webResult.sent + fcmResult.sent,
    pruned: webResult.pruned + fcmResult.pruned,
  };
}

// org의 모든 OWNER에게 fan-out (결석 신청, 정류장 변경 요청 알림).
// W23: FCM도 함께 fan-out (OWNER가 RN 앱을 깔면 동작 — 베타에는 OWNER는 PWA만).
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

  // 각 OWNER마다 web-push + FCM 병렬 fan-out
  let sent = 0;
  let pruned = 0;
  await Promise.all(
    owners.map(async (o) => {
      const [web, fcm] = await Promise.all([
        sendWebPushToStaff(o.id, payload),
        sendFcmToStaff(o.id, payload),
      ]);
      sent += web.sent + fcm.sent;
      pruned += web.pruned + fcm.pruned;
    }),
  );
  return { sent, pruned };
}
