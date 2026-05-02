import { headers } from "next/headers";

import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";
import { studentTerm } from "@/lib/i18n/org-terms";

import { GuardianInviteForm } from "./invite-form";

export default async function NewGuardianInvitePage() {
  const me = await requireOwner();
  const orgId = await getOrgId();
  const term = studentTerm(me.org.type);

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const origin = `${proto}://${host}`;

  const students = await db.student.findMany({
    where: { orgId },
    orderBy: [{ birthYear: "desc" }, { name: "asc" }],
    select: { id: true, name: true, birthYear: true },
  });

  return (
    <main className="mx-auto max-w-3xl p-6">
      <GuardianInviteForm
        origin={origin}
        students={students}
        termLabel={term}
      />
    </main>
  );
}
