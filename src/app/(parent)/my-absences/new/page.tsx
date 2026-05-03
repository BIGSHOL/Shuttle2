import { db } from "@/lib/db";
import { requireGuardian } from "@/lib/auth/session";

import { AbsenceForm } from "./absence-form";

export default async function NewAbsencePage() {
  const me = await requireGuardian();
  const studentIds = me.students.map((s) => s.id);

  const students = await db.student.findMany({
    where: { id: { in: studentIds } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      org: { select: { name: true } },
    },
  });

  return (
    <main className="px-4 pt-4 pb-6">
      <AbsenceForm students={students} />
    </main>
  );
}
