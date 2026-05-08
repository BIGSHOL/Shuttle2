// W24-C P3 C8: 결제·요금제 페이지. UI만 — 결제 게이트웨이(Toss/Stripe) 통합은
// 별도 turn. 베타 운영자가 현재 구독·요금제 비교를 한 화면에서 확인.

import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";

import { CurrentSubscriptionCard } from "./_components/current-subscription-card";
import { InvoiceHistory } from "./_components/invoice-history";
import { PlanComparison } from "./_components/plan-comparison";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  await requireOwner();
  const orgId = await getOrgId();

  // 현재 plan은 Organization.plan에서 — session에는 status만 있음.
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { plan: true },
  });

  // 첫 진입 시 default trial subscription 생성. trialEndsAt = 30일 후.
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const subscription = await db.tenantSubscription.upsert({
    where: { orgId },
    update: {},
    create: {
      orgId,
      plan: org?.plan ?? "TRIAL",
      status: "TRIAL",
      billingCycle: "MONTHLY",
      currentPeriodStart: now,
      currentPeriodEnd: thirtyDaysLater,
      trialEndsAt: thirtyDaysLater,
    },
  });

  // 청구서 history (최대 12건)
  const invoices = await db.invoice.findMany({
    where: { orgId },
    orderBy: { issuedAt: "desc" },
    take: 12,
  });

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex flex-col gap-1">
        <p className="text-muted-foreground text-[11px] font-extrabold tracking-[0.1em] uppercase">
          학원장 설정
        </p>
        <h1 className="text-2xl font-black tracking-tight">결제·요금제</h1>
        <p className="text-muted-foreground text-xs font-semibold">
          현재 구독 상태와 요금제를 관리합니다. 베타 기간 동안 모든 학원은
          체험판 요금제로 무료 운영 중.
        </p>
      </header>

      <CurrentSubscriptionCard subscription={subscription} />

      <PlanComparison currentPlan={subscription.plan} />

      <InvoiceHistory invoices={invoices} />
    </main>
  );
}
