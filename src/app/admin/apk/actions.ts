"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireShuttleAdmin } from "@/lib/auth/admin";
import { writeAuditLog } from "@/lib/auth/audit";

const AddInput = z.object({
  version: z
    .string()
    .trim()
    .regex(/^\d+\.\d+\.\d+$/, "semver 형식이어야 합니다 (예: 1.0.1)"),
  apkUrl: z.string().url("URL 형식이 올바르지 않습니다"),
  releaseNotes: z.string().optional(),
  makeActive: z.boolean().optional().default(true),
});

type ActionResult = { ok: true } | { ok: false; error: string };

export async function addReleaseAction(
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireShuttleAdmin();
  const parsed = AddInput.safeParse({
    version: formData.get("version"),
    apkUrl: formData.get("apkUrl"),
    releaseNotes: formData.get("releaseNotes") ?? "",
    makeActive: formData.get("makeActive") === "1",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "검증 실패" };
  }
  const { version, apkUrl, releaseNotes, makeActive } = parsed.data;

  // version unique 체크
  const existing = await db.driverAppRelease.findUnique({
    where: { version },
  });
  if (existing) {
    return {
      ok: false,
      error: `version ${version}은 이미 등록되어 있습니다`,
    };
  }

  await db.$transaction(async (tx) => {
    if (makeActive) {
      await tx.driverAppRelease.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }
    await tx.driverAppRelease.create({
      data: {
        version,
        apkUrl,
        releaseNotes: releaseNotes || null,
        isActive: makeActive,
      },
    });
  });

  await writeAuditLog({
    actorEmail: admin.email,
    action: "DRIVER_APP_RELEASE_ADDED",
    payload: { version, apkUrl, isActive: makeActive },
  });
  revalidatePath("/admin/apk");
  return { ok: true };
}

export async function setActiveReleaseAction(
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireShuttleAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "id 누락" };

  const target = await db.driverAppRelease.findUnique({ where: { id } });
  if (!target) return { ok: false, error: "release 없음" };

  await db.$transaction(async (tx) => {
    await tx.driverAppRelease.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    await tx.driverAppRelease.update({
      where: { id },
      data: { isActive: true },
    });
  });

  await writeAuditLog({
    actorEmail: admin.email,
    action: "DRIVER_APP_RELEASE_ACTIVATED",
    payload: { id, version: target.version },
  });
  revalidatePath("/admin/apk");
  return { ok: true };
}
