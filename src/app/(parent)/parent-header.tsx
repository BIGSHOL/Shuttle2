"use client";

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

export function ParentHeader({
  name,
  email,
  childCount,
}: {
  name: string;
  email: string;
  childCount: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <header className="bg-background border-b">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 p-3">
        <div>
          <h1 className="text-base font-semibold">셔틀이</h1>
          <p className="text-muted-foreground text-xs">
            {name} · 자녀 {childCount}명
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {name} ▾
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{email}</p>
              <p className="text-muted-foreground text-xs">학부모</p>
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
