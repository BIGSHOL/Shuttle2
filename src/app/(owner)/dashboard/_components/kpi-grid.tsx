import type { LucideIcon } from "lucide-react";

// W24-B C1: 학원장 dashboard 상단 KPI 4-grid. tone 토큰 일관성 + 라운드 스케일
// (rounded-lg 외곽 / rounded-md 내부 — CLAUDE.md 가드레일).
//
// page에서 KPI 4개를 한 array로 정의해 KpiGrid에 넘김.

export type KpiTone =
  | "info"
  | "bus"
  | "warning"
  | "destructive"
  | "muted";

export type KpiCard = {
  label: string;
  value: number;
  subtext: string;
  Icon: LucideIcon;
  tone: KpiTone;
  pulse?: boolean;
};

const TONE_CLS: Record<KpiTone, { bg: string; text: string }> = {
  info: { bg: "bg-info-soft", text: "text-info" },
  bus: { bg: "bg-bus-soft", text: "text-bus-foreground" },
  warning: { bg: "bg-warning-soft", text: "text-warning" },
  destructive: { bg: "bg-destructive/10", text: "text-destructive" },
  muted: { bg: "bg-muted", text: "text-muted-foreground" },
};

export function KpiGrid({ items }: { items: KpiCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((it) => (
        <KpiCardItem key={it.label} {...it} />
      ))}
    </div>
  );
}

function KpiCardItem({ label, value, subtext, Icon, tone, pulse }: KpiCard) {
  const t = TONE_CLS[tone];
  return (
    <div className="bg-card relative overflow-hidden rounded-lg border p-5 shadow-sm transition-shadow hover:shadow-md">
      {pulse ? (
        <div className="from-destructive/8 pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br to-transparent blur-2xl" />
      ) : null}
      <div className="relative flex items-start gap-2">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-2 border-current/15 ${t.bg} ${t.text}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <p className="text-muted-foreground min-w-0 flex-1 pt-1.5 text-[11px] font-black tracking-[0.08em] uppercase leading-tight">
          {label}
        </p>
        {pulse ? (
          <span className="relative mt-2 inline-flex h-2 w-2 shrink-0">
            <span className="bg-destructive absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
            <span className="bg-destructive relative inline-flex h-2 w-2 rounded-full" />
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-4xl font-black tracking-tighter tabular-nums leading-none">
        {value}
      </p>
      <p className="text-muted-foreground mt-2 text-[11px] font-semibold leading-relaxed">
        {subtext}
      </p>
    </div>
  );
}
