import Link from "next/link";
import { type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type KpiTone =
  | "info"
  | "bus"
  | "warning"
  | "destructive"
  | "success"
  | "muted";

const TONE_CLS: Record<KpiTone, { bg: string; text: string }> = {
  info: { bg: "bg-info-soft", text: "text-info" },
  bus: { bg: "bg-bus-soft", text: "text-bus-foreground" },
  warning: { bg: "bg-warning-soft", text: "text-warning" },
  destructive: { bg: "bg-destructive/10", text: "text-destructive" },
  success: { bg: "bg-success-soft", text: "text-success" },
  muted: { bg: "bg-muted", text: "text-muted-foreground" },
};

// 공용 KPI 카드. 학원장 dashboard·list·report 모두 동일 시각 일관성 유지.
// 외곽 rounded-lg(CLAUDE.md 외곽 규약), 내부 아이콘 박스 rounded-md.
// `pulse`는 destructive·warning 임박 시각 강조 (안 보내면 정적).
// `href` 주면 Link로 wrap, 없으면 div.
export function KpiCard({
  label,
  value,
  subtext,
  Icon,
  tone = "muted",
  pulse,
  href,
  className,
}: {
  label: string;
  value: number | string;
  subtext?: string;
  Icon?: LucideIcon;
  tone?: KpiTone;
  pulse?: boolean;
  href?: string;
  className?: string;
}) {
  const t = TONE_CLS[tone];
  const inner = (
    <>
      {pulse ? (
        <div className="from-destructive/8 pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br to-transparent blur-2xl" />
      ) : null}
      <div className="relative flex items-start gap-2">
        {Icon ? (
          <span
            className={cn(
              "border-current/15 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-2",
              t.bg,
              t.text,
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
        <p className="text-muted-foreground min-w-0 flex-1 pt-1.5 text-[11px] leading-tight font-black tracking-[0.08em] uppercase">
          {label}
        </p>
        {pulse ? (
          <span className="relative mt-2 inline-flex h-2 w-2 shrink-0">
            <span className="bg-destructive absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
            <span className="bg-destructive relative inline-flex h-2 w-2 rounded-full" />
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-3xl leading-none font-black tracking-tighter tabular-nums lg:text-4xl">
        {value}
      </p>
      {subtext ? (
        <p className="text-muted-foreground mt-2 text-[11px] leading-relaxed font-semibold">
          {subtext}
        </p>
      ) : null}
    </>
  );

  const baseCls = cn(
    "bg-card relative overflow-hidden rounded-lg border p-4 shadow-sm transition-shadow lg:p-5",
    href && "hover:border-foreground/30 hover:shadow-md cursor-pointer block",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={baseCls}>
        {inner}
      </Link>
    );
  }
  return <div className={baseCls}>{inner}</div>;
}

// KPI strip — 외곽 1px 보더 + 내부 1px gap divider + 셀별 padding으로 한
// 줄 strip 스타일을 만든다. 카드별 그림자 없음, 카드 vs strip 두 변형 중
// 선택. ground truth `Owner Students.html` 같은 빽빽한 5-strip에 사용.
export function KpiStrip({
  children,
  cols = 5,
  className,
}: {
  children: React.ReactNode;
  cols?: 3 | 4 | 5;
  className?: string;
}) {
  const colsCls =
    cols === 5
      ? "lg:grid-cols-5"
      : cols === 4
        ? "lg:grid-cols-4"
        : "lg:grid-cols-3";
  return (
    <div
      className={cn(
        "bg-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border",
        colsCls,
        className,
      )}
    >
      {children}
    </div>
  );
}

// strip 안에 들어가는 단일 셀. KpiCard보다 더 빽빽 — divider 패턴.
export function KpiStripCell({
  label,
  value,
  subtext,
  Icon,
  tone = "muted",
}: {
  label: string;
  value: number | string;
  subtext?: string;
  Icon?: LucideIcon;
  tone?: KpiTone;
}) {
  const t = TONE_CLS[tone];
  return (
    <div className="bg-card flex items-start gap-3 p-4">
      {Icon ? (
        <span
          className={cn(
            "border-current/15 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-2",
            t.bg,
            t.text,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-[10px] leading-tight font-black tracking-[0.08em] uppercase">
          {label}
        </p>
        <p className="mt-1 text-2xl leading-none font-black tracking-tight tabular-nums">
          {value}
        </p>
        {subtext ? (
          <p className="text-muted-foreground mt-1 text-[10px] font-semibold">
            {subtext}
          </p>
        ) : null}
      </div>
    </div>
  );
}
