"use server";

import { z } from "zod";

import { requireShuttleAdmin } from "@/lib/auth/admin";
import { writeAuditLog } from "@/lib/auth/audit";
import { sendToGuardian, sendToStaff } from "@/lib/push/server";

const SendInput = z.object({
  kind: z.enum(["STAFF", "GUARDIAN"]),
  id: z.string().min(1),
  title: z.string().min(1, "제목은 필수입니다"),
  body: z.string().min(1, "본문은 필수입니다"),
  url: z.string().optional(),
});

type ActionResult =
  | { ok: true; sent: number; pruned: number }
  | { ok: false; error: string };

export async function sendTestPushAction(
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireShuttleAdmin();
  const parsed = SendInput.safeParse({
    kind: formData.get("kind"),
    id: formData.get("id"),
    title: formData.get("title"),
    body: formData.get("body"),
    url: formData.get("url") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "검증 실패" };
  }
  const { kind, id, title, body, url } = parsed.data;

  try {
    const result =
      kind === "STAFF"
        ? await sendToStaff(id, {
            title,
            body,
            url: url || undefined,
            category: "ANNOUNCEMENT",
          })
        : await sendToGuardian(id, {
            title,
            body,
            url: url || undefined,
            category: "ANNOUNCEMENT",
          });

    await writeAuditLog({
      actorEmail: admin.email,
      action: "PUSH_TEST_SENT",
      payload: { kind, id, title, body, sent: result.sent, pruned: result.pruned },
    });

    return { ok: true, sent: result.sent, pruned: result.pruned };
  } catch (err) {
    console.error("[admin push test]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "푸시 발송 실패",
    };
  }
}
