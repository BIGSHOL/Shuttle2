// W24-B C5: 운영 정책 페이지 — 결석/정류장 변경 자동 처리 + 마감 시각 + 알림.
import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";

import { PoliciesForm } from "./_components/policies-form";

export const dynamic = "force-dynamic";

export default async function PoliciesPage() {
  await requireOwner();
  const orgId = await getOrgId();

  // 첫 진입 시 default 자동 생성
  const policy = await db.tenantPolicy.upsert({
    where: { orgId },
    update: {},
    create: { orgId },
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-6">
      <header className="mb-5">
        <p className="text-muted-foreground text-[11px] font-extrabold tracking-[0.1em] uppercase">
          학원장 설정
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">운영 정책</h1>
        <p className="text-muted-foreground mt-1.5 text-xs font-semibold">
          결석·정류장 변경 자동 처리·마감 시각·알림 정책. 변경은 즉시 반영됩니다.
        </p>
      </header>
      <PoliciesForm policy={policy} />
    </div>
  );
}
