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

const ROLE_LABEL = {
  DRIVER: "기사",
  HELPER: "동승보호자",
  OWNER: "학원장·원장",
} as const;

export function DriverHeader({
  orgName,
  role,
  email,
  staffName,
}: {
  orgName: string;
  role: "DRIVER" | "HELPER";
  email: string;
  staffName: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <header className="bg-background border-b">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 p-3">
        <div>
          <h1 className="text-base font-semibold">{orgName}</h1>
          <p className="text-muted-foreground text-xs">
            {ROLE_LABEL[role]} · {staffName}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {staffName} ▾
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{email}</p>
              <p className="text-muted-foreground text-xs">
                {ROLE_LABEL[role]}
              </p>
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
