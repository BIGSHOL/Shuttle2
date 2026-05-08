import { Calendar, CheckCircle2, CreditCard, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

const PLAN_LABEL = {
  TRIAL: "체험판",
  BASIC: "기본",
  PRO: "프로",
} as const;

const STATUS_LABEL = {
  TRIAL: "체험 중",
  ACTIVE: "활성",
  PAST_DUE: "결제 지연",
  CANCELED: "해지 예약",
  EXPIRED: "만료",
} as const;

const STATUS_TONE: Record<string, string> = {
  TRIAL: "bg-bus-soft text-bus-foreground",
  ACTIVE: "bg-success-soft text-success",
  PAST_DUE: "bg-warning-soft text-warning",
  CANCELED: "bg-muted text-muted-foreground",
  EXPIRED: "bg-destructive/10 text-destructive",
};

const BILLING_CYCLE_LABEL = {
  MONTHLY: "월간",
  YEARLY: "연간",
} as const;

function fmtKstDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function daysUntil(d: Date | null): number | null {
  if (!d) return null;
  const diffMs = d.getTime() - Date.now();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

type Subscription = {
  plan: "TRIAL" | "BASIC" | "PRO";
  status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED";
  billingCycle: "MONTHLY" | "YEARLY";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
};

export function CurrentSubscriptionCard({
  subscription,
}: {
  subscription: Subscription;
}) {
  const isTrial = subscription.status === "TRIAL";
  const trialDaysLeft = daysUntil(subscription.trialEndsAt);

  return (
    <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
      <div className="border-b px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-[11px] font-extrabold tracking-[0.08em] uppercase">
              현재 구독
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black tracking-tight">
                {PLAN_LABEL[subscription.plan]}
              </h2>
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-[0.05em] uppercase ${STATUS_TONE[subscription.status]}`}
              >
                {STATUS_LABEL[subscription.status]}
              </span>
              <span className="text-muted-foreground text-[11px] font-bold">
                · {BILLING_CYCLE_LABEL[subscription.billingCycle]} 결제
              </span>
            </div>
          </div>
          {isTrial ? (
            <span className="bg-bus-soft text-bus-foreground inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-extrabold">
              <Sparkles className="h-3.5 w-3.5" />
              베타 무료
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-px bg-border lg:grid-cols-3">
        <InfoCell
          icon={Calendar}
          label="현재 결제 주기"
          value={`${fmtKstDate(subscription.currentPeriodStart)} ~ ${fmtKstDate(subscription.currentPeriodEnd)}`}
        />
        <InfoCell
          icon={CheckCircle2}
          label={isTrial ? "체험 종료" : "다음 결제일"}
          value={
            isTrial
              ? `${fmtKstDate(subscription.trialEndsAt)} (${trialDaysLeft ?? "—"}일 남음)`
              : fmtKstDate(subscription.currentPeriodEnd)
          }
        />
        <InfoCell
          icon={CreditCard}
          label="결제 수단"
          value={
            subscription.cancelAtPeriodEnd ? "주기 종료 시 해지" : "미등록"
          }
          tone={subscription.cancelAtPeriodEnd ? "warning" : "muted"}
        />
      </div>

      <div className="border-t bg-muted/30 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted-foreground text-[11px] font-medium">
            결제 수단 등록·요금제 변경·구독 해지는 결제 게이트웨이 통합 후
            사용 가능합니다.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled
              title="결제 게이트웨이 통합 후 사용 가능"
            >
              결제 수단 등록
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled
              title="결제 게이트웨이 통합 후 사용 가능"
            >
              요금제 변경
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoCell({
  icon: Icon,
  label,
  value,
  tone = "muted",
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
  tone?: "muted" | "warning";
}) {
  const toneCls =
    tone === "warning" ? "text-warning" : "text-muted-foreground";
  return (
    <div className="bg-card px-4 py-3">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${toneCls}`} />
        <p className="text-muted-foreground text-[10px] font-extrabold tracking-[0.08em] uppercase">
          {label}
        </p>
      </div>
      <p className="mt-1 text-sm font-extrabold tabular-nums">{value}</p>
    </div>
  );
}
