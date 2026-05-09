import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";

// W24-C P3 C8: 요금제 비교 — 3-tier (TRIAL / BASIC / PRO).
// 가격은 베타 진입 임시안. 결제 게이트웨이 통합 후 정식 가격 확정 + 업그레이드/다운그레이드 활성화.

type Plan = "TRIAL" | "BASIC" | "PRO";

const FEATURES = [
  { label: "안전운행기록 PDF", trial: true, basic: true, pro: true },
  { label: "실시간 GPS 위치", trial: true, basic: true, pro: true },
  { label: "결석·정류장 변경 워크플로", trial: true, basic: true, pro: true },
  { label: "푸시 알림", trial: true, basic: true, pro: true },
  { label: "차량 1대 운영", trial: true, basic: true, pro: true },
  { label: "차량 5대까지", trial: false, basic: true, pro: true },
  { label: "차량 무제한", trial: false, basic: false, pro: true },
  { label: "다지점 통합 관리", trial: false, basic: false, pro: true },
  { label: "우선 지원·카카오톡 문의", trial: false, basic: false, pro: true },
];

const PLAN_INFO: Record<
  Plan,
  { label: string; price: string; subtitle: string; tone: string }
> = {
  TRIAL: {
    label: "체험판",
    price: "₩0",
    subtitle: "베타 기간 무료",
    tone: "bg-muted/40",
  },
  BASIC: {
    label: "기본",
    price: "₩30,000",
    subtitle: "차량당 월 (최대 5대)",
    tone: "bg-info-soft/40",
  },
  PRO: {
    label: "프로",
    price: "₩50,000",
    subtitle: "차량당 월 (무제한)",
    tone: "bg-bus-soft",
  },
};

export function PlanComparison({ currentPlan }: { currentPlan: Plan }) {
  const plans: Plan[] = ["TRIAL", "BASIC", "PRO"];

  return (
    <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
      <div className="border-b px-5 py-4">
        <h3 className="text-base font-extrabold tracking-tight">요금제 비교</h3>
        <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
          베타 기간 동안 모든 학원은 체험판으로 무료. 정식 가격·결제는 게이트웨이
          통합 후 적용.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-px bg-border lg:grid-cols-3">
        {plans.map((plan) => {
          const info = PLAN_INFO[plan];
          const isCurrent = plan === currentPlan;
          return (
            <div
              key={plan}
              className={`flex flex-col p-5 ${info.tone} ${isCurrent ? "ring-bus ring-2 ring-inset" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-lg font-black tracking-tight">
                  {info.label}
                </h4>
                {isCurrent ? (
                  <span className="bg-bus text-bus-foreground rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-[0.05em] uppercase">
                    현재 구독
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-3xl font-black tabular-nums">
                {info.price}
              </p>
              <p className="text-muted-foreground mt-1 text-xs font-semibold">
                {info.subtitle}
              </p>
              <ul className="mt-4 flex-1 space-y-1.5 text-xs">
                {FEATURES.map((f) => {
                  const enabled =
                    plan === "TRIAL"
                      ? f.trial
                      : plan === "BASIC"
                        ? f.basic
                        : f.pro;
                  return (
                    <li
                      key={f.label}
                      className={`flex items-center gap-1.5 ${enabled ? "" : "text-muted-foreground/60"}`}
                    >
                      {enabled ? (
                        <Check className="text-success h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <X className="text-muted-foreground/40 h-3.5 w-3.5 shrink-0" />
                      )}
                      <span className={enabled ? "font-medium" : "line-through"}>
                        {f.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    이용 중
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled
                    title="결제 게이트웨이 통합 후 사용 가능"
                  >
                    {plan === "TRIAL" ? "체험판으로" : "이 요금제로"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
