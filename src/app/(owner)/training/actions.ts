"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

// 안전교육 이수 기록. 도교법상 운영자·기사·동승자는 2년마다 이수 의무.
// expiresOn은 입력값 그대로 (사용자가 "만료일 = 다음 의무 이수일"을 직접 지정).

const STORAGE_BUCKET = "training-certificates";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png"] as const;
type AllowedMime = (typeof ALLOWED_MIME)[number];

const Input = z.object({
  staffId: z.string().min(1, "직원을 선택해 주세요"),
  category: z.enum(["OPERATOR", "DRIVER", "HELPER"]),
  completedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "이수일이 올바르지 않습니다"),
  expiresOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "만료일이 올바르지 않습니다"),
  certificateUrl: z
    .string()
    .url("URL 형식이 아닙니다")
    .optional()
    .or(z.literal("")),
});

export type TrainingFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  // mode === "file"인 경우 client에서 이 recordId로 후속 업로드 호출
  recordId?: string;
  ok?: boolean;
};

export async function createTrainingRecordAction(
  _prev: TrainingFormState,
  formData: FormData,
): Promise<TrainingFormState> {
  await requireOwner();
  const orgId = await getOrgId();

  const parsed = Input.safeParse({
    staffId: formData.get("staffId"),
    category: formData.get("category"),
    completedOn: formData.get("completedOn"),
    expiresOn: formData.get("expiresOn"),
    certificateUrl: formData.get("certificateUrl") || undefined,
  });
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }
  const { staffId, category, completedOn, expiresOn, certificateUrl } =
    parsed.data;

  // staffId가 본 기관 소속인지 검증
  const staff = await db.staff.findFirst({
    where: { id: staffId, orgId },
    select: { id: true },
  });
  if (!staff) return { error: "다른 학원 직원입니다." };

  const created = await db.trainingRecord.create({
    data: {
      staffId,
      category,
      completedOn: new Date(`${completedOn}T00:00:00.000Z`),
      expiresOn: new Date(`${expiresOn}T00:00:00.000Z`),
      certificateUrl: certificateUrl ? certificateUrl : null,
    },
    select: { id: true },
  });

  revalidatePath("/training");
  revalidatePath("/dashboard");

  // redirect 대신 ok+recordId 반환 — file 모드 client가 후속 업로드 가능.
  // none·url 모드는 client에서 ok 받으면 location.href = "/training" 처리.
  return { ok: true, recordId: created.id };
}

export async function deleteTrainingRecordAction(
  recordId: string,
): Promise<void> {
  await requireOwner();
  const orgId = await getOrgId();

  const rec = await db.trainingRecord.findFirst({
    where: { id: recordId, staff: { orgId } },
    select: { id: true, certificateFile: true },
  });
  if (!rec) {
    throw new Error("삭제할 수 없는 기록입니다");
  }

  // Storage 파일 cleanup. 실패해도 DB delete는 진행 (orphan보다 dead row가 더 위험).
  if (rec.certificateFile) {
    const admin = createSupabaseAdmin();
    const { error } = await admin.storage
      .from(STORAGE_BUCKET)
      .remove([rec.certificateFile]);
    if (error) {
      console.error("[training] storage cleanup failed", { recordId, error });
    }
  }

  await db.trainingRecord.delete({ where: { id: rec.id } });

  revalidatePath("/training");
  revalidatePath("/dashboard");
}

// ────────────────────────────────────────────────────────────────────
// 이수증 파일 업로드
// ────────────────────────────────────────────────────────────────────

export type CertificateUploadState = { ok?: boolean; error?: string };

// Magic-byte 검증: 첫 8 바이트만 읽어 직접 시그니처 매칭 (라이브러리 의존 X).
// MIME 변조(.exe → .pdf) 차단.
function detectKindByMagic(
  bytes: Uint8Array,
  declaredMime: AllowedMime,
): { ok: true; ext: "pdf" | "jpg" | "png" } | { ok: false } {
  // PDF: 25 50 44 46 ("%PDF")
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    if (declaredMime !== "application/pdf") return { ok: false };
    return { ok: true, ext: "pdf" };
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    if (declaredMime !== "image/jpeg") return { ok: false };
    return { ok: true, ext: "jpg" };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    if (declaredMime !== "image/png") return { ok: false };
    return { ok: true, ext: "png" };
  }
  return { ok: false };
}

export async function uploadTrainingCertificateAction(
  _prev: CertificateUploadState,
  formData: FormData,
): Promise<CertificateUploadState> {
  await requireOwner();
  const orgId = await getOrgId();

  const recordId = formData.get("recordId");
  const file = formData.get("file");

  if (typeof recordId !== "string" || !recordId) {
    return { error: "잘못된 요청입니다" };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "파일이 선택되지 않았습니다" };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: "파일 크기는 5MB 이하여야 합니다" };
  }
  const declaredMime = file.type;
  if (!ALLOWED_MIME.includes(declaredMime as AllowedMime)) {
    return { error: "PDF·JPG·PNG만 업로드할 수 있어요 (HEIC 미지원)" };
  }

  // 권한 + 본 기관 record인지 확인
  const rec = await db.trainingRecord.findFirst({
    where: { id: recordId, staff: { orgId } },
    select: { id: true, certificateFile: true },
  });
  if (!rec) {
    return { error: "다른 학원 기록이거나 존재하지 않는 기록입니다" };
  }

  const buffer = await file.arrayBuffer();
  const head = new Uint8Array(buffer.slice(0, 8));
  const kind = detectKindByMagic(head, declaredMime as AllowedMime);
  if (!kind.ok) {
    return { error: "파일 형식이 올바르지 않습니다" };
  }

  const admin = createSupabaseAdmin();

  // 기존 파일 cleanup (재업로드 케이스). 실패는 로그만.
  if (rec.certificateFile) {
    const { error: rmError } = await admin.storage
      .from(STORAGE_BUCKET)
      .remove([rec.certificateFile]);
    if (rmError) {
      console.error("[training] previous file cleanup failed", {
        recordId,
        oldKey: rec.certificateFile,
        rmError,
      });
    }
  }

  const objectKey = `${orgId}/${recordId}/${randomUUID()}.${kind.ext}`;
  const { error: upError } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(objectKey, buffer, {
      contentType: declaredMime,
      upsert: false,
    });
  if (upError) {
    console.error("[training] upload failed", { recordId, upError });
    // 흔한 운영 실수: 버킷 미생성. 대시보드 안내.
    if (/Bucket not found/i.test(upError.message)) {
      return {
        error:
          "스토리지 버킷이 설정되지 않았습니다. 관리자에게 문의해 주세요.",
      };
    }
    return { error: "파일 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  try {
    await db.trainingRecord.update({
      where: { id: rec.id },
      data: { certificateFile: objectKey },
    });
  } catch (e) {
    // DB 실패 시 방금 올린 객체 rollback
    await admin.storage.from(STORAGE_BUCKET).remove([objectKey]);
    console.error("[training] DB update failed, rolled back upload", {
      recordId,
      e,
    });
    return { error: "기록 갱신에 실패했습니다" };
  }

  revalidatePath("/training");
  return { ok: true };
}

// ────────────────────────────────────────────────────────────────────
// 이수증 다운로드용 signed URL 발급 (1시간 유효)
// ────────────────────────────────────────────────────────────────────

export type SignedUrlResult =
  | { url: string; expiresAt: number }
  | { error: string };

export async function getCertificateSignedUrlAction(
  recordId: string,
): Promise<SignedUrlResult> {
  await requireOwner();
  const orgId = await getOrgId();

  const rec = await db.trainingRecord.findFirst({
    where: { id: recordId, staff: { orgId } },
    select: { certificateFile: true },
  });
  if (!rec) return { error: "권한이 없거나 존재하지 않는 기록입니다" };
  if (!rec.certificateFile) return { error: "이수증 파일이 없습니다" };

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(rec.certificateFile, 3600);
  if (error || !data) {
    console.error("[training] signed URL failed", { recordId, error });
    return { error: "이수증 링크 생성에 실패했습니다" };
  }
  return { url: data.signedUrl, expiresAt: Date.now() + 3600 * 1000 };
}
