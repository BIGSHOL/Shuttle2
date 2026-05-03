"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bus, Check, KeyRound, Loader2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

import { resetPasswordAction, type ResetState } from "./actions";

type SessionStatus =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "expired" };

// Supabase의 비밀번호 재설정 메일 링크는 다음 두 형태 중 하나:
// 1) hash fragment: #access_token=...&refresh_token=...&type=recovery
// 2) query param: ?code=... (PKCE 흐름)
// 클라이언트에서 setSession(또는 exchangeCodeForSession) 호출 → 서버 세션 수립 →
// 그 후 server action으로 updateUser.
export function ResetForm() {
  const router = useRouter();
  const [session, setSession] = useState<SessionStatus>({ kind: "loading" });
  const [state, action, pending] = useActionState<ResetState, FormData>(
    resetPasswordAction,
    {},
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const url = new URL(window.location.href);

      // hash 형식 (Implicit flow)
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type");

      // query 형식 (PKCE flow)
      const code = url.searchParams.get("code");

      try {
        if (accessToken && refreshToken && type === "recovery") {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          // 토큰 hash 제거 (refresh 시 재처리 안 되도록)
          history.replaceState({}, "", url.pathname);
          if (!cancelled) setSession({ kind: "ready" });
          return;
        }
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          history.replaceState({}, "", url.pathname);
          if (!cancelled) setSession({ kind: "ready" });
          return;
        }
        // hash·code 둘 다 없으면 이미 setSession된 상태인지 확인
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          if (!cancelled) setSession({ kind: "ready" });
        } else {
          if (!cancelled) setSession({ kind: "expired" });
        }
      } catch (err) {
        console.error("reset-password session setup failed:", err);
        if (!cancelled) setSession({ kind: "expired" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 성공 시 잠깐 메시지 보여준 후 /login으로
  useEffect(() => {
    if (state.ok) {
      const t = setTimeout(() => router.push("/login"), 2500);
      return () => clearTimeout(t);
    }
  }, [state.ok, router]);

  return (
    <div className="w-full max-w-md space-y-6">
      <Link href="/" className="flex items-center justify-center gap-2">
        <span className="bg-bus text-bus-foreground flex h-9 w-9 items-center justify-center rounded-xl shadow-sm">
          <Bus className="h-5 w-5" />
        </span>
        <span className="text-lg font-extrabold tracking-tight">셔틀이</span>
      </Link>

      {session.kind === "loading" ? (
        <div className="bg-card rounded-2xl border p-6 text-center shadow-sm">
          <Loader2 className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
          <p className="mt-4 text-sm font-bold">재설정 링크 확인 중...</p>
        </div>
      ) : session.kind === "expired" ? (
        <div className="bg-card rounded-2xl border p-6 text-center shadow-sm">
          <span className="bg-destructive/10 text-destructive mx-auto flex h-12 w-12 items-center justify-center rounded-full">
            <KeyRound className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-xl font-extrabold tracking-tight">
            재설정 링크가 유효하지 않아요
          </h2>
          <p className="text-muted-foreground mt-2 text-sm font-medium leading-relaxed">
            링크가 만료되었거나 이미 사용되었습니다.
            <br />
            비밀번호 찾기를 다시 시도해 주세요.
          </p>
          <div className="mt-5">
            <Button asChild variant="outline" size="sm">
              <Link href="/forgot-password">다시 보내기</Link>
            </Button>
          </div>
        </div>
      ) : state.ok ? (
        <div className="border-success/30 bg-success-soft/40 rounded-2xl border p-6 text-center shadow-sm">
          <span className="bg-success text-success-foreground mx-auto flex h-12 w-12 items-center justify-center rounded-full">
            <Check className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-xl font-extrabold tracking-tight">
            비밀번호가 변경되었어요
          </h2>
          <p className="text-muted-foreground mt-2 text-sm font-medium">
            잠시 후 로그인 페이지로 이동합니다.
          </p>
          <div className="mt-5">
            <Button asChild size="sm">
              <Link href="/login">바로 로그인</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border p-6 shadow-sm">
          <div className="flex items-start gap-2">
            <span className="bg-bus-soft text-bus-foreground mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
              <KeyRound className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-extrabold tracking-tight">
                새 비밀번호 설정
              </h2>
              <p className="text-muted-foreground mt-1 text-sm font-medium">
                8자 이상의 새 비밀번호를 입력해 주세요.
              </p>
            </div>
          </div>
          <form action={action} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-bold">
                새 비밀번호
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="8자 이상"
                minLength={8}
                required
                autoFocus
              />
            </div>
            {state.error ? (
              <div
                className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-2.5 text-xs font-medium"
                role="alert"
              >
                {state.error}
              </div>
            ) : null}
            <Button
              type="submit"
              className="w-full text-base font-extrabold"
              size="lg"
              disabled={pending}
            >
              {pending ? "변경 중..." : "비밀번호 변경"}
            </Button>
          </form>
        </div>
      )}

      <p className="text-muted-foreground text-center text-[11px] font-medium">
        ©{" "}
        <Link href="/" className="hover:underline">
          셔틀이
        </Link>{" "}
        · 도로교통법 §53⑦ 안전운행기록 자동화
      </p>
    </div>
  );
}
