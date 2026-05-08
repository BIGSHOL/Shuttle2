import { db } from "@/lib/db";
import { requireGuardian } from "@/lib/auth/session";

import { AbsenceForm } from "./absence-form";

const CURRENT_YEAR = new Date().getFullYear();

// W24-D Phase 1 absences/new: data/refac/screenshots/parent-app.jpg "03 · /absences/new".
// 자녀별 노선·정류장 정보를 미리 fetch해 form opt-list "{name} · 5세 · 햇살반"
// + sub "A노선 · 해솔아파트 정문 · 등하원"을 그려준다.
export default async function NewAbsencePage() {
  const me = await requireGuardian();
  const studentIds = me.students.map((s) => s.id);

  const students = await db.student.findMany({
    where: { id: { in: studentIds } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      birthYear: true,
      org: { select: { name: true } },
      routes: {
        select: {
          stop: { select: { name: true } },
          route: { select: { name: true, direction: true } },
        },
      },
    },
  });

  // hi-fi opt sub line — 노선·정류장·등하원 표기. 자녀가 등·하원 모두 배정된
  // 가장 흔한 케이스를 단순 line 1줄로 요약.
  const formStudents = students.map((s) => {
    const routeNames = Array.from(
      new Set(s.routes.map((r) => r.route.name)),
    ).filter(Boolean);
    const stopNames = Array.from(
      new Set(s.routes.map((r) => r.stop.name)),
    ).filter(Boolean);
    const directions = new Set(s.routes.map((r) => r.route.direction));
    const directionLabel =
      directions.has("PICKUP") && directions.has("DROPOFF")
        ? "등하원"
        : directions.has("PICKUP")
          ? "등원"
          : directions.has("DROPOFF")
            ? "하원"
            : null;
    const subParts = [
      routeNames.join("·") || null,
      stopNames.join("·") || null,
      directionLabel,
    ].filter((x): x is string => Boolean(x));

    return {
      id: s.id,
      name: s.name,
      age: CURRENT_YEAR - s.birthYear,
      orgName: s.org.name,
      sub: subParts.join(" · "),
    };
  });

  return <AbsenceForm students={formStudents} />;
}
