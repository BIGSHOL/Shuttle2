import { Check, CreditCard, FileText, Receipt, Wallet } from "lucide-react";

import { KpiStrip, KpiStripCell } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

const PLAN_LABEL = {
  TRIAL: "체험판",
  BASIC: "기본",
  PRO: "프로",
} as const;

const PLAN_PRICE = {
  TRIAL: 0,
  BASIC: 99000,
  PRO: 220000,
} as const;

const PLAN_FEATURES = [
  "차량 무제한",
  "실시간 GPS 추적",
  "안전점검 자동 기록",
  "운행 통계·리포트",
  "학부모 자동 알림 (SMS·푸시)",
  "이메일 + 카카오 고객지원",
] as const;

// 학원장 요금·청구 화면. 베타 기간은 placeholder 데이터 — 실제 결제 통합
// (Toss Payments / Stripe + Subscription/Invoice 모델)은 P1 backlog. UI는
// ground truth `Owner Billing.html`와 동일 톤·구조로 구성.
export default async function BillingPage() {
  const user = await requireOwner();
  const orgId = await getOrgId();

  const [vehicleCount, studentCount, org] = await Promise.all([
    db.vehicle.count({ where: { orgId } }),
    db.student.count({ where: { orgId } }),
    db.organization.findUnique({
      where: { id: orgId },
      select: { plan: true, createdAt: true },
    }),
  ]);

  const plan = org?.plan ?? "TRIAL";
  const planPrice = PLAN_PRICE[plan];

  // 다음 청구 (다음달 1일).
  const now = new Date();
  const nextBillingDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  const nextBillingLabel = nextBillingDate.toISOString().slice(0, 10);

  // placeholder 청구서 line items.
  const lineItems = [
    {
      label: `${PLAN_LABEL[plan]} 플랜 (월 정기)`,
      detail: "차량 무제한 · 학생 200명 포함",
      amount: planPrice,
    },
    {
      label: "정원 추가",
      detail:
        studentCount > 200
          ? `${studentCount - 200}명 초과 · 1명당 1,000원`
          : "포함 정원 내",
      amount: studentCount > 200 ? (studentCount - 200) * 1000 : 0,
    },
    {
      label: "SMS 발송",
      detail: "이번 달 824건 · 무료 1,000건 이내",
      amount: 0,
    },
    {
      label: "학부모 자동결제 처리수수료",
      detail: "건당 150원",
      amount: 0,
    },
  ];
  const subtotal = lineItems.reduce((s, l) => s + l.amount, 0);
  const vat = Math.round(subtotal * 0.1);
  const total = subtotal + vat;

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 lg:p-6">
      {/* 헤더 + 액션 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight lg:text-3xl">
            요금·청구
          </h2>
          <p className="text-muted-foreground mt-1 text-xs font-semibold lg:text-sm">
            구독 플랜 · 학원 청구 · 학부모 자동결제 통합 관리.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled>
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            거래내역 PDF
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Receipt className="mr-1.5 h-3.5 w-3.5" />
            세금계산서
          </Button>
        </div>
      </div>

      {/* tab placeholder (현재는 "구독" 활성) */}
      <nav
        aria-label="요금·청구 탭"
        className="border-b"
      >
        <ul className="-mb-px flex gap-4">
          {[
            { key: "subscription", label: "구독", active: true },
            { key: "parent-billing", label: "학부모 청구", badge: 0 },
            { key: "history", label: "거래 내역" },
            { key: "plan-change", label: "플랜 변경" },
          ].map((t) => (
            <li key={t.key}>
              <button
                type="button"
                disabled={!t.active}
                aria-current={t.active ? "page" : undefined}
                className={cn(
                  "border-b-2 px-1 py-2.5 text-sm font-bold tracking-tight transition-colors",
                  t.active
                    ? "border-foreground text-foreground"
                    : "text-muted-foreground border-transparent hover:text-foreground/70 disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                {t.label}
                {t.badge != null && t.badge > 0 ? (
                  <span className="bg-destructive text-destructive-foreground ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-extrabold">
                    {t.badge}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* 현재 플랜 카드 */}
      <Card>
        <CardContent className="p-5 lg:p-6">
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold tracking-tight">
                  {PLAN_LABEL[plan]} 플랜
                </h3>
                <span className="bg-bus-soft text-bus-foreground rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-wide">
                  현재 플랜
                </span>
              </div>
              <p className="text-muted-foreground mt-1 text-xs font-semibold">
                월 {planPrice.toLocaleString()}원 · 차량 {vehicleCount}대 · 학생{" "}
                {studentCount}명 · 다음 청구 {nextBillingLabel}
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {PLAN_FEATURES.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-xs font-semibold"
                  >
                    <Check className="text-success mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-bus-soft/40 border-bus/15 rounded-lg border-2 p-4">
              <p className="text-muted-foreground text-[10px] font-extrabold tracking-wider uppercase">
                다음 청구
              </p>
              <p className="mt-1 text-3xl font-black tracking-tight tabular-nums">
                {planPrice.toLocaleString()}
                <span className="text-base font-bold">원</span>
              </p>
              <p className="text-muted-foreground mt-1 text-[11px] font-semibold">
                {nextBillingLabel} 자동결제
                <br />
                신한카드 ****1234 (예시)
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" disabled>
                  결제수단 변경
                </Button>
                <Button size="sm" variant="outline" disabled>
                  청구 미리보기
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI 4 */}
      <KpiStrip cols={4}>
        <KpiStripCell
          label="이번 달 누적"
          value={`+${(planPrice / 10000).toFixed(0)}만원`}
          subtext={`${PLAN_LABEL[plan]} 플랜 결제 예정`}
          Icon={Wallet}
          tone="info"
        />
        <KpiStripCell
          label="학부모 결제 수금률"
          value="—"
          subtext="자동결제 통합 후 표시"
          Icon={Receipt}
          tone="muted"
        />
        <KpiStripCell
          label="미납 건수"
          value={0}
          subtext="이상 없음"
          Icon={CreditCard}
          tone="success"
        />
        <KpiStripCell
          label="최근 12개월"
          value={`${(planPrice * 12 / 10000).toFixed(0)}만원`}
          subtext="구독료 누적 (예상)"
          Icon={FileText}
          tone="muted"
        />
      </KpiStrip>

      {/* 청구서 미리보기 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="text-muted-foreground h-4 w-4" />
            다음 청구 미리보기
          </CardTitle>
          <CardDescription>
            {nextBillingLabel} 자동결제 예정 청구서. 정원 추가·SMS 발송·자동결제
            처리수수료가 사용량에 따라 합산됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {lineItems.map((l) => (
              <li
                key={l.label}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold tracking-tight">{l.label}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {l.detail}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-extrabold tabular-nums">
                  {l.amount.toLocaleString()}원
                </p>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 px-5 py-3">
              <p className="text-sm font-bold">부가세 (10%)</p>
              <p className="shrink-0 text-sm font-extrabold tabular-nums">
                {vat.toLocaleString()}원
              </p>
            </li>
            <li className="bg-muted/40 flex items-center justify-between gap-3 px-5 py-4">
              <p className="text-base font-black">합계</p>
              <p className="shrink-0 text-xl font-black tabular-nums">
                {total.toLocaleString()}원
              </p>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* 결제 수단 — placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="text-muted-foreground h-4 w-4" />
            결제 수단
          </CardTitle>
          <CardDescription>
            베타 기간은 결제 수단 등록을 받지 않습니다. 정식 출시 시 토스
            페이먼츠·Stripe 통합 예정.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <p className="text-muted-foreground p-5 text-sm">
            등록된 결제 수단이 없습니다. 정식 출시 후 안내드릴 예정입니다.
          </p>
        </CardContent>
      </Card>

      <p className="text-muted-foreground/70 text-center text-[11px]">
        {user.org.name} · 가입 {org?.createdAt.toISOString().slice(0, 10)} ·
        베타 기간 무료
      </p>
    </main>
  );
}
