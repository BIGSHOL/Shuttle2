"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireShuttleAdmin } from "@/lib/auth/admin";
import { writeAuditLog } from "@/lib/auth/audit";
import { setImpersonateCookie } from "@/lib/auth/impersonate";

const PlanInput = z.enum(["TRIAL", "BASIC", "PRO"]);

export async function updateOrgPlanAction(formData: FormData) {
  const admin = await requireShuttleAdmin();
  const orgId = String(formData.get("orgId") ?? "");
  const planRaw = String(formData.get("plan") ?? "");
  const plan = PlanInput.parse(planRaw);

  await db.organization.update({
    where: { id: orgId },
    data: { plan },
  });
  await writeAuditLog({
    actorEmail: admin.email,
    action: "ORG_PLAN_CHANGED",
    targetOrgId: orgId,
    payload: { plan },
  });
  revalidatePath(`/admin/orgs/${orgId}`);
  revalidatePath(`/admin/orgs`);
}

export async function suspendOrgAction(formData: FormData) {
  const admin = await requireShuttleAdmin();
  const orgId = String(formData.get("orgId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;

  await db.organization.update({
    where: { id: orgId },
    data: {
      status: "SUSPENDED",
      suspendedAt: new Date(),
      suspendReason: reason,
    },
  });
  await writeAuditLog({
    actorEmail: admin.email,
    action: "ORG_SUSPENDED",
    targetOrgId: orgId,
    payload: { reason },
  });
  revalidatePath(`/admin/orgs/${orgId}`);
  revalidatePath(`/admin/orgs`);
  revalidatePath(`/admin`);
}

export async function activateOrgAction(formData: FormData) {
  const admin = await requireShuttleAdmin();
  const orgId = String(formData.get("orgId") ?? "");

  await db.organization.update({
    where: { id: orgId },
    data: {
      status: "ACTIVE",
      activatedAt: new Date(),
      suspendReason: null,
    },
  });
  await writeAuditLog({
    actorEmail: admin.email,
    action: "ORG_ACTIVATED",
    targetOrgId: orgId,
  });
  revalidatePath(`/admin/orgs/${orgId}`);
  revalidatePath(`/admin/orgs`);
  revalidatePath(`/admin`);
}

// W24: 매니저가 학원장 시점으로 임시 진입. cookie set + audit log + redirect.
// /dashboard로 가면 (owner)/layout이 cookie 감지 → 빨간 띠 표시.
export async function startImpersonationAction(formData: FormData) {
  const admin = await requireShuttleAdmin();
  const orgId = String(formData.get("orgId") ?? "");

  // org 존재 확인
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, status: true },
  });
  if (!org) throw new Error("ORG_NOT_FOUND");

  await setImpersonateCookie(orgId, admin.email);
  await writeAuditLog({
    actorEmail: admin.email,
    action: "IMPERSONATE_START",
    targetOrgId: orgId,
    payload: { orgName: org.name, orgStatus: org.status },
  });
  redirect("/dashboard");
}
