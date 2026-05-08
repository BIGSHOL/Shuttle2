"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";

const schema = z.object({
  absenceAutoAck: z.enum(["on", "off"]).optional(),
  absenceCutoffMin: z.coerce.number().int().min(0).max(720),
  stopChangeAutoApprove: z.enum(["on", "off"]).optional(),
  stopChangeRequiresReason: z.enum(["on", "off"]).optional(),
  stopChangeMaxDays: z.coerce.number().int().min(0).max(365),
  notifyParentOnDecision: z.enum(["on", "off"]).optional(),
  notifyDriverOnApprove: z.enum(["on", "off"]).optional(),
});

export async function updatePoliciesAction(formData: FormData) {
  await requireOwner();
  const orgId = await getOrgId();
  const data = schema.parse(Object.fromEntries(formData));

  await db.tenantPolicy.upsert({
    where: { orgId },
    create: {
      orgId,
      absenceAutoAck: data.absenceAutoAck === "on",
      absenceCutoffMin: data.absenceCutoffMin,
      stopChangeAutoApprove: data.stopChangeAutoApprove === "on",
      stopChangeRequiresReason: data.stopChangeRequiresReason === "on",
      stopChangeMaxDays: data.stopChangeMaxDays,
      notifyParentOnDecision: data.notifyParentOnDecision === "on",
      notifyDriverOnApprove: data.notifyDriverOnApprove === "on",
    },
    update: {
      absenceAutoAck: data.absenceAutoAck === "on",
      absenceCutoffMin: data.absenceCutoffMin,
      stopChangeAutoApprove: data.stopChangeAutoApprove === "on",
      stopChangeRequiresReason: data.stopChangeRequiresReason === "on",
      stopChangeMaxDays: data.stopChangeMaxDays,
      notifyParentOnDecision: data.notifyParentOnDecision === "on",
      notifyDriverOnApprove: data.notifyDriverOnApprove === "on",
    },
  });

  revalidatePath("/settings/policies");
}
