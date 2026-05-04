"use client";

import Link from "next/link";
import { Bus, Check, ShieldCheck, Users } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  acceptGuardianInviteAction,
  type AcceptGuardianInviteState,
} from "@/app/(owner)/guardians/actions";

export function ParentAcceptForm({
  token,
  invite,
}: {
  token: string;
  invite: {
    name: string;
    relation: string;
    loginId: string;
    org: { name: string };
    students: { name: string }[];
  };
}) {
  const boundAction = acceptGuardianInviteAction.bind(null, token);
  const [state, formAction, pending] = useActionState<
    AcceptGuardianInviteState,
    FormData
  >(boundAction, {});

  return (
    <div className="w-full max-w-md space-y-6">
      <Link href="/" className="flex items-center justify-center gap-2">
        <span className="bg-bus text-bus-foreground flex h-9 w-9 items-center justify-center rounded-xl shadow-sm">
          <Bus className="h-5 w-5" />
        </span>
        <span className="text-lg font-extrabold tracking-tight">셔틀이</span>
      </Link>

      {/* 초대 정보 카드 */}
      <div className="bg-card rounded-2xl border p-5 shadow-sm">
        <p className="text-muted-foreground text-[10px] font-extrabold tracking-wide uppercase">
          초대 정보
        </p>
        <div className="mt-2 space-y-2">
          <div className="flex items-start gap-2">
            <span className="bg-bus-soft text-bus-foreground mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
              <Bus className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold tracking-wide uppercase text-muted-foreground">
                기관
              </p>
              <p className="truncate text-sm font-extrabold">
                {invite.org.name}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="bg-info-soft text-info mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold tracking-wide uppercase text-muted-foreground">
                보호자
              </p>
              <p className="text-sm font-extrabold">
                {invite.name}{" "}
                <span className="text-muted-foreground text-xs font-medium">
                  ({invite.relation})
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="bg-success-soft text-success mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
              <Users className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold tracking-wide uppercase text-muted-foreground">
                자녀
              </p>
              <p className="text-sm font-extrabold">
                {invite.students.map((s) => s.name).join(", ")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 가입 폼 */}
      <div className="bg-card rounded-2xl border p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">학부모 가입</h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            비밀번호만 정해 주세요. 자녀 운행 정보·푸시 알림에 접근할 수 있게
            됩니다.
          </p>
        </div>
        <form action={formAction} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">로그인 아이디</Label>
            <div className="bg-muted rounded-md border px-3 py-2 font-mono text-sm font-bold">
              {invite.loginId}
            </div>
            <p className="text-muted-foreground text-[11px] font-medium">
              앞으로 로그인할 때 쓰는 아이디입니다. 학원장·원장님이 정하셨어요.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-bold">
              비밀번호
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="8자 이상"
              minLength={8}
              required
            />
            {state.fieldErrors?.password ? (
              <p className="text-destructive text-xs font-medium">
                {state.fieldErrors.password[0]}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="recoveryEmail" className="text-xs font-bold">
              비밀번호 찾기용 이메일{" "}
              <span className="text-muted-foreground font-medium">(선택)</span>
            </Label>
            <Input
              id="recoveryEmail"
              name="recoveryEmail"
              type="email"
              autoComplete="email"
              placeholder="example@gmail.com"
            />
            <p className="text-muted-foreground text-[11px] font-medium">
              비밀번호를 잊으면 이 이메일로 다시 만들 수 있어요. 안 적으면
              학원장님께 부탁해야 합니다.
            </p>
            {state.fieldErrors?.recoveryEmail ? (
              <p className="text-destructive text-xs font-medium">
                {state.fieldErrors.recoveryEmail[0]}
              </p>
            ) : null}
          </div>

          <label className="border-input bg-background hover:bg-muted/40 has-[:checked]:border-bus has-[:checked]:bg-bus-soft/40 flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm transition-colors">
            <input
              type="checkbox"
              name="consentMinor"
              className="accent-bus mt-0.5 h-4 w-4"
              required
            />
            <span className="text-xs font-medium">
              자녀(미성년자)의 운행 정보·정류장 위치·탑승·하차·안전점검 기록
              열람 및 푸시 알림 수신에 동의합니다.{" "}
              <Link
                href="/terms"
                target="_blank"
                className="text-primary font-bold underline-offset-2 hover:underline"
              >
                이용약관
              </Link>
              {" · "}
              <Link
                href="/privacy"
                target="_blank"
                className="text-primary font-bold underline-offset-2 hover:underline"
              >
                개인정보처리방침
              </Link>
            </span>
          </label>
          {state.fieldErrors?.consentMinor ? (
            <p className="text-destructive text-xs font-medium">
              {state.fieldErrors.consentMinor[0]}
            </p>
          ) : null}

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
            <Check className="mr-1 h-4 w-4" />
            {pending ? "가입 중..." : "가입하고 자녀 운행 보기"}
          </Button>
        </form>

        <p className="text-muted-foreground mt-4 text-center text-xs font-medium">
          이미 계정이 있다면{" "}
          <Link
            href="/login"
            className="text-primary font-bold underline-offset-2 hover:underline"
          >
            로그인
          </Link>
        </p>
      </div>

      <p className="text-muted-foreground text-center text-[11px] font-medium">
        © 셔틀이 · 가입 정보는{" "}
        <Link href="/" className="hover:underline">
          기관과만 공유
        </Link>
        됩니다
      </p>
    </div>
  );
}
