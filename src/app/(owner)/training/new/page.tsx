import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";

import { TrainingForm } from "./training-form";

export default async function NewTrainingPage() {
  await requireOwner();
  const orgId = await getOrgId();

  const staffs = await db.staff.findMany({
    where: { orgId },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, role: true },
  });

  return (
    <main className="mx-auto max-w-md p-6">
      <TrainingForm staffs={staffs} />
    </main>
  );
}
