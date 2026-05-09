import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

// W24-C P1: 빈 상태 표준 컴포넌트.
// 모든 list/queue/page에서 데이터가 없을 때 일관된 UI 표시.

export type EmptyStateAction =
  | { label: string; href: string; onClick?: never }
  | { label: string; href?: never; onClick: () => void };

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
}) {
  return (
    <div
      className={`bg-card rounded-lg border-2 border-dashed p-8 text-center shadow-sm ${className ?? ""}`}
    >
      <div className="bg-muted/60 mx-auto flex h-14 w-14 items-center justify-center rounded-md">
        <Icon className="text-muted-foreground h-7 w-7" />
      </div>
      <p className="mt-4 text-base font-extrabold tracking-tight">{title}</p>
      {description ? (
        <p className="text-muted-foreground mt-1.5 text-xs font-semibold leading-relaxed">
          {description}
        </p>
      ) : null}
      {action ? (
        <div className="mt-4">
          {action.href ? (
            <Button asChild variant="outline" size="sm">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={action.onClick}
              type="button"
            >
              {action.label}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
