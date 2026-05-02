"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";

import { logoutAction } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const ORG_TYPE_LABEL: Record<"ACADEMY" | "DAYCARE" | "KINDERGARTEN", string> = {
  ACADEMY: "학원·교습소",
  DAYCARE: "어린이집",
  KINDERGARTEN: "유치원",
};

const NAV = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/vehicles", label: "차량" },
  { href: "/stops", label: "정류장" },
  { href: "/routes", label: "노선" },
];

export function OwnerHeader({
  orgName,
  orgType,
  email,
}: {
  orgName: string;
  orgType: "ACADEMY" | "DAYCARE" | "KINDERGARTEN";
  email: string;
}) {
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();

  return (
    <header className="bg-background border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 p-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="block">
            <h1 className="text-lg font-semibold">{orgName}</h1>
            <p className="text-muted-foreground text-xs">
              {ORG_TYPE_LABEL[orgType]} · 셔틀이
            </p>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {email.split("@")[0]} ▾
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{email}</p>
              <p className="text-muted-foreground text-xs">학원장·원장</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={pending}
              onSelect={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  await logoutAction();
                });
              }}
            >
              {pending ? "로그아웃 중..." : "로그아웃"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
