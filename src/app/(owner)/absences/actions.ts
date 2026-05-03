"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth/session";
import { sendToStaff } from "@/lib/push/server";

// OWNER가 학부모 결석 신청을 확인 처리. PENDING → ACKNOWLEDGED.
// 동시에 자녀가 배정된 노선들의 driver(+ helper)에게 push 발송.
// "결석" 정보를 driver가 미리 알아야 운행 시 빈 자리·승차 확인이 명확.
export async function ackAbsenceAction(absenceId: string): Promise<void> {
  const me = await requireOwner();

  const absence = await db.absenceRequest.findUnique({
    where: { id: absenceId },
    select: {
      id: true,
      status: true,
      type: true,
      date: true,
      student: {
        select: {
          id: true,
          name: true,
          orgId: true,
          // 자녀가 배정된 노선들 — 등원/하원 모두
          routes: {
            select: {
              route: { select: { id: true, direction: true, name: true } },
            },
          },
        },
      },
    },
  });
  if (!absence) throw new Error("결석 신청을 찾을 수 없습니다");
  if (absence.student.orgId !== me.org.id) {
    throw new Error("FORBIDDEN: 다른 학원의 결석 신청입니다");
  }
  if (absence.status === "ACKNOWLEDGED") {
    return; // 이미 처리됨 — 멱등
  }

  await db.absenceRequest.update({
    where: { id: absenceId },
    data: { status: "ACKNOWLEDGED" },
  });

  // type으로 영향 받는 방향 노선만 추출
  const affectedDirections = new Set<"PICKUP" | "DROPOFF">();
  if (absence.type === "ABSENT_BOTH") {
    affectedDirections.add("PICKUP");
    affectedDirections.add("DROPOFF");
  } else if (absence.type === "ABSENT_PICKUP") {
    affectedDirections.add("PICKUP");
  } else if (absence.type === "ABSENT_DROPOFF") {
    affectedDirections.add("DROPOFF");
  }

  const affectedRouteIds = absence.student.routes
    .filter((rs) => affectedDirections.has(rs.route.direction))
    .map((rs) => rs.route.id);

  if (affectedRouteIds.length > 0) {
    // 그 날짜 + 노선의 trip → driverId/helperId 모음 (trip이 미생성이면
    // 운행 시작 시 driver가 /run에서 결석 list를 보게 됨)
    const trips = await db.trip.findMany({
      where: { date: absence.date, routeId: { in: affectedRouteIds } },
      select: { driverId: true, helperId: true, route: { select: { name: true } } },
    });

    const dateLabel = absence.date.toISOString().slice(0, 10);
    const directionLabel =
      absence.type === "ABSENT_BOTH"
        ? "등·하원"
        : absence.type === "ABSENT_PICKUP"
          ? "등원"
          : "하원";

    const staffIds = new Set<string>();
    for (const t of trips) {
      staffIds.add(t.driverId);
      if (t.helperId) staffIds.add(t.helperId);
    }

    await Promise.all(
      Array.from(staffIds).map((sid) =>
        sendToStaff(sid, {
          title: "결석 알림",
          body: `${absence.student.name} · ${dateLabel} · ${directionLabel} 결석 (확인 완료)`,
          url: "/run",
        }),
      ),
    ).catch((e) => console.warn("driver absence push failed:", e));
  }

  revalidatePath("/absences");
}
