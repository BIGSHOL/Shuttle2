"use client";

import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

// 전역 error boundary — 서버 component / route handler / unhandled
// runtime error 시 표시. Next.js 가 reset() 호출하면 segment 재시도.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry/로그서버 연동 hook 자리. 현재는 console.
    console.error("[GlobalError]", error.message, error.digest);
  }, [error]);

  return (
    <main className="bg-muted/30 flex min-h-screen items-center justify-center p-6">
      <div className="bg-card w-full max-w-md space-y-6 rounded-lg border p-8 text-center shadow-sm">
        <div className="bg-destructive/10 text-destructive mx-auto flex h-14 w-14 items-center justify-center rounded-full">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            문제가 생겼어요
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            잠시 후 다시 시도해 주세요. 같은 문제가 계속 보이면 학원·기관에
            문의해 주세요.
          </p>
          {error.digest ? (
            <p className="text-muted-foreground/60 mt-2 font-mono text-[10px]">
              참고 코드: {error.digest}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={reset} className="w-full">
            <RefreshCw className="mr-1.5 h-4 w-4" />
            다시 시도
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">
              <Home className="mr-1.5 h-4 w-4" />
              메인으로
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
