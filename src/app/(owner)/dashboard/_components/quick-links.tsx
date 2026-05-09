import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

// W24-B C1: 학원장 dashboard 하단 빠른 이동 링크 4-grid.
// 라운드 스케일 통일 (rounded-lg 외곽 / rounded-md 내부 — CLAUDE.md 가드레일).

export type QuickLinkItem = {
  href: string;
  label: string;
  value: number;
  Icon: LucideIcon;
};

export function QuickLinks({ items }: { items: QuickLinkItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((it) => (
        <QuickLinkCard key={it.href} {...it} />
      ))}
    </div>
  );
}

function QuickLinkCard({ href, label, value, Icon }: QuickLinkItem) {
  return (
    <Link
      href={href}
      className="bg-card group hover:border-foreground/30 hover:bg-muted/40 flex items-center justify-between rounded-lg border p-5 shadow-sm transition-all"
    >
      <div>
        <p className="text-muted-foreground text-[11px] font-black tracking-[0.08em] uppercase">
          {label}
        </p>
        <p className="mt-1.5 text-3xl font-black tracking-tighter tabular-nums leading-none">
          {value}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <div className="bg-muted/60 flex h-10 w-10 items-center justify-center rounded-md">
          <Icon className="text-muted-foreground h-5 w-5" />
        </div>
        <ChevronRight className="text-muted-foreground/60 group-hover:text-foreground/70 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
