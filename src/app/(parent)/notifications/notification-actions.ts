"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireGuardian } from "@/lib/auth/session";
import { todayUtcDateKst } from "@/lib/date/today";
import { sendToOwnersOfOrg, sendToStaff } from "@/lib/push/server";

// 학부모가 본인 알림 1건을 읽음 처리. userId(auth.users.id) 일치 검증.
export async function markNotificationReadAction(
  notificationId: string,
): Promise<void> {
  const me = await requireGuardian();
  await db.notification.updateMany({
    where: {
      id: notificationId,
      userId: me.authUserId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
}

// 모두 읽음 처리.
export async function markAllNotificationsReadAction(): Promise<void> {
  const me = await requireGuardian();
  await db.notification.updateMany({
    where: { userId: me.authUserId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
  revalidatePath("/home");
}

// M2: 학부모가 NO_SHOW 알림을 받은 후 "지금 데려다 드릴게요" 응답.
// 본인 자녀들 중 오늘 NO_SHOW 보고된 진행 중 trip을 자동 매칭하고
// 해당 trip의 기사 + org owners에게 alert push.
//
// Notification.payload에 trip/student 메타데이터가 없는 현 구조에서는
// 학부모 → 자녀 → 오늘 NO_SHOW BoardingEvent 역추적이 가장 정확.
export type RespondNoShowResult =
  | { ok: true; studentName: string }
  | { error: string };

export async function respondNoShowOnWayAction(): Promise<RespondNoShowResult> {
  const me = await requireGuardian();
  const today = todayUtcDateKst();

  const myStudentIds = me.students.map((s) => s.id);
  if (myStudentIds.length === 0) {
    return { error: "등록된 자녀가 없어요" };
  }

  const event = await db.boardingEvent.findFirst({
    where: {
      type: "NO_SHOW",
      studentId: { in: myStudentIds },
      trip: { endedAt: null, date: today },
    },
    orderBy: { at: "desc" },
    select: {
      tripId: true,
      student: { select: { name: true, orgId: true } },
      trip: {
        select: {
          driverId: true,
          route: { select: { name: true } },
        },
      },
    },
  });

  if (!event) {
    return {
      error: "오늘 진행 중인 미탑승 보고가 없어요. 학원에 직접 연락해 주세요.",
    };
  }

  const title = `[학부모 응답] ${event.student.name} 곧 도착`;
  const body = `${me.guardian.name} 보호자가 "지금 데려다 드릴게요"를 눌렀어요. ${event.trip.route.name} 정류장에서 잠시 기다려 주세요.`;

  const tasks: Promise<unknown>[] = [];
  if (event.trip.driverId) {
    tasks.push(
      sendToStaff(event.trip.driverId, {
        category: "ANNOUNCEMENT",
        title,
        body,
        url: `/trip/${event.tripId}`,
      }).catch((e) => console.error("driver push failed:", e)),
    );
  }
  tasks.push(
    sendToOwnersOfOrg(event.student.orgId, {
      category: "ANNOUNCEMENT",
      title,
      body,
      url: `/dashboard/trip/${event.tripId}`,
    }).catch((e) => console.error("owners push failed:", e)),
  );
  await Promise.all(tasks);

  return { ok: true, studentName: event.student.name };
}
