"use server";

import { redirect } from "next/navigation";

import {
  clearImpersonateCookie,
  readImpersonateCookie,
} from "@/lib/auth/impersonate";
import { writeAuditLog } from "@/lib/auth/audit";

// W24: 임시 진입 종료 — cookie 삭제 + audit log + redirect.
export async function stopImpersonationAction() {
  const cookie = await readImpersonateCookie();
  await clearImpersonateCookie();

  if (cookie) {
    await writeAuditLog({
      actorEmail: cookie.adminEmail,
      action: "IMPERSONATE_END",
      targetOrgId: cookie.orgId,
    });
    redirect(`/admin/orgs/${cookie.orgId}`);
  }
  redirect("/admin");
}
