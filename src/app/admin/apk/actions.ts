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
    .regex(
      /^\d+\.\d+\.\d+$/,
      "버전은 숫자.숫자.숫자 형식이어야 합니다 (예: 1.0.1)",
    ),
  apkUrl: z.string().url("URL 형식이 올바르지 않습니다"),
  releaseNotes: z.string().optional(),
  sha256: z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{64}$/, "SHA256은 64자리 16진수 문자열이어야 합니다")
    .optional()
    .or(z.literal("")),
  fileSizeBytes: z.coerce
    .number()
    .int()
    .positive("파일 크기는 양의 정수여야 합니다")
    .optional()
    .or(z.literal(0)),
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
    sha256: formData.get("sha256") ?? "",
    fileSizeBytes: formData.get("fileSizeBytes") || 0,
    makeActive: formData.get("makeActive") === "1",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "검증 실패" };
  }
  const { version, apkUrl, releaseNotes, sha256, fileSizeBytes, makeActive } =
    parsed.data;

  // version unique 체크
  const existing = await db.driverAppRelease.findUnique({
    where: { version },
  });
  if (existing) {
    return {
      ok: false,
      error: `버전 ${version}은 이미 등록되어 있습니다`,
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
        sha256: sha256 ? sha256.toLowerCase() : null,
        fileSizeBytes:
          typeof fileSizeBytes === "number" && fileSizeBytes > 0
            ? fileSizeBytes
            : null,
        isActive: makeActive,
      },
    });
  });

  await writeAuditLog({
    actorEmail: admin.email,
    action: "DRIVER_APP_RELEASE_ADDED",
    payload: {
      version,
      apkUrl,
      isActive: makeActive,
      hasSha256: Boolean(sha256),
      fileSizeBytes: fileSizeBytes || null,
    },
  });
  revalidatePath("/admin/apk");
  return { ok: true };
}

const EditInput = z.object({
  id: z.string().min(1),
  apkUrl: z.string().url("URL 형식이 올바르지 않습니다"),
  releaseNotes: z.string().optional(),
  sha256: z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{64}$/, "SHA256은 64자리 16진수 문자열이어야 합니다")
    .optional()
    .or(z.literal("")),
  fileSizeBytes: z.coerce
    .number()
    .int()
    .positive("파일 크기는 양의 정수여야 합니다")
    .optional()
    .or(z.literal(0)),
});

export async function editReleaseAction(
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireShuttleAdmin();
  const parsed = EditInput.safeParse({
    id: formData.get("id"),
    apkUrl: formData.get("apkUrl"),
    releaseNotes: formData.get("releaseNotes") ?? "",
    sha256: formData.get("sha256") ?? "",
    fileSizeBytes: formData.get("fileSizeBytes") || 0,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "검증 실패" };
  }
  const { id, apkUrl, releaseNotes, sha256, fileSizeBytes } = parsed.data;

  const target = await db.driverAppRelease.findUnique({ where: { id } });
  if (!target) return { ok: false, error: "해당 버전을 찾을 수 없습니다" };

  await db.driverAppRelease.update({
    where: { id },
    data: {
      apkUrl,
      releaseNotes: releaseNotes || null,
      sha256: sha256 ? sha256.toLowerCase() : null,
      fileSizeBytes:
        typeof fileSizeBytes === "number" && fileSizeBytes > 0
          ? fileSizeBytes
          : null,
    },
  });

  await writeAuditLog({
    actorEmail: admin.email,
    action: "DRIVER_APP_RELEASE_EDITED",
    payload: {
      id,
      version: target.version,
      apkUrl,
      hasSha256: Boolean(sha256),
      fileSizeBytes: fileSizeBytes || null,
    },
  });
  revalidatePath("/admin/apk");
  return { ok: true };
}

export async function setActiveReleaseAction(
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireShuttleAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "버전 ID가 비어 있습니다" };

  const target = await db.driverAppRelease.findUnique({ where: { id } });
  if (!target) return { ok: false, error: "해당 버전을 찾을 수 없습니다" };

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
