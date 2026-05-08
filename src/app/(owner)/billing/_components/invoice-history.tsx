import { FileText } from "lucide-react";

import { EmptyState } from "@/components/empty-state";

// W24-C P3 C8: 청구서 history (12건). UI만 — 실제 데이터는 결제 게이트웨이 webhook으로 채워짐.

const STATUS_LABEL = {
  DRAFT: "초안",
  ISSUED: "발행됨",
  PAID: "결제 완료",
  VOID: "취소됨",
} as const;

const STATUS_TONE: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ISSUED: "bg-warning-soft text-warning",
  PAID: "bg-success-soft text-success",
  VOID: "bg-destructive/10 text-destructive",
};

type Invoice = {
  id: string;
  amount: number;
  currency: string;
  status: "DRAFT" | "ISSUED" | "PAID" | "VOID";
  periodStart: Date;
  periodEnd: Date;
  issuedAt: Date;
  paidAt: Date | null;
};

function fmtKstDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function fmtAmount(amount: number, currency: string): string {
  if (currency === "KRW") return `₩${amount.toLocaleString("ko-KR")}`;
  return `${amount.toLocaleString("ko-KR")} ${currency}`;
}

export function InvoiceHistory({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="청구서가 없어요"
        description="베타 기간 동안 결제가 발생하지 않습니다. 정식 출시 후 청구서가 생성되면 여기 표시됩니다."
      />
    );
  }

  return (
    <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
      <div className="border-b px-5 py-4">
        <h3 className="text-base font-extrabold tracking-tight">청구서</h3>
        <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
          최근 12건. PDF 다운로드는 결제 게이트웨이 통합 후 활성화.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr className="text-muted-foreground text-[10px] font-extrabold tracking-[0.06em] uppercase">
              <Th>발행일</Th>
              <Th>구간</Th>
              <Th>금액</Th>
              <Th>상태</Th>
              <Th>결제일</Th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t font-medium">
                <td className="text-muted-foreground px-4 py-3 font-mono text-xs font-bold tabular-nums">
                  {fmtKstDate(inv.issuedAt)}
                </td>
                <td className="text-muted-foreground px-4 py-3 font-mono text-[11px] font-bold tabular-nums">
                  {fmtKstDate(inv.periodStart)} ~ {fmtKstDate(inv.periodEnd)}
                </td>
                <td className="px-4 py-3 font-mono text-sm font-extrabold tabular-nums">
                  {fmtAmount(inv.amount, inv.currency)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-[0.05em] uppercase ${STATUS_TONE[inv.status]}`}
                  >
                    {STATUS_LABEL[inv.status]}
                  </span>
                </td>
                <td className="text-muted-foreground px-4 py-3 font-mono text-xs font-bold tabular-nums">
                  {fmtKstDate(inv.paidAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-left">{children}</th>;
}
