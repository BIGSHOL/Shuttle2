"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  ChevronRight,
  LogOut,
  Phone,
  Smartphone,
  User,
} from "lucide-react";

import { logoutAction } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";

// W24-D Phase 1: 학부모 BottomTabBar의 "내 정보" 탭. refac에는 단독 spec 없음 —
// PWA banner + 알림 권한 + 로그아웃 등 home에서 빠진 항목들을 모음.

export default function ParentMePage() {
  const [pending, startTransition] = useTransition();

  return (
    <main className="space-y-4 px-4 pt-4 pb-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight">내 정보</h1>
        <p className="text-muted-foreground mt-1.5 text-[13px] font-bold">
          알림 권한·앱 설치·계정 관리
        </p>
      </header>

      {/* 알림 권한 카드 */}
      <section className="bg-card rounded-lg border p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="bg-bus-soft text-bus-foreground flex h-9 w-9 items-center justify-center rounded-md">
            <Phone className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-extrabold tracking-tight">
              자녀 셔틀 알림
            </h2>
            <p className="text-muted-foreground mt-0.5 text-[12px] font-semibold leading-relaxed">
              자녀 정류장 도착·탑승 완료 시 즉시 푸시 알림. 알림 설정은 브라우저
              설정에서 변경할 수 있어요.
            </p>
          </div>
        </div>
      </section>

      {/* 앱 설치 안내 카드 */}
      <section className="bg-card rounded-lg border p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="bg-info-soft text-info flex h-9 w-9 items-center justify-center rounded-md">
            <Smartphone className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-extrabold tracking-tight">
              셔틀이 앱 설치
            </h2>
            <p className="text-muted-foreground mt-0.5 text-[12px] font-semibold leading-relaxed">
              안드로이드 Chrome 메뉴 → "홈 화면에 추가" / iOS Safari 공유 →
              "홈 화면에 추가"로 설치하면 일반 앱처럼 사용할 수 있어요.
            </p>
          </div>
        </div>
      </section>

      {/* 계정 관리 list */}
      <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
        <Link
          href="/my-absences"
          className="hover:bg-muted/40 flex items-center gap-3 border-b p-4 transition-colors"
        >
          <span className="bg-warning-soft text-warning flex h-8 w-8 items-center justify-center rounded-md">
            <User className="h-4 w-4" />
          </span>
          <span className="flex-1 text-[13px] font-extrabold tracking-tight">
            내 결석 신청
          </span>
          <ChevronRight className="text-muted-foreground h-4 w-4" />
        </Link>
        <Link
          href="/my-stop-changes"
          className="hover:bg-muted/40 flex items-center gap-3 p-4 transition-colors"
        >
          <span className="bg-info-soft text-info flex h-8 w-8 items-center justify-center rounded-md">
            <User className="h-4 w-4" />
          </span>
          <span className="flex-1 text-[13px] font-extrabold tracking-tight">
            내 정류장 변경
          </span>
          <ChevronRight className="text-muted-foreground h-4 w-4" />
        </Link>
      </section>

      {/* 로그아웃 */}
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            await logoutAction();
          });
        }}
      >
        <LogOut className="mr-1.5 h-4 w-4" />
        {pending ? "로그아웃 중..." : "로그아웃"}
      </Button>
    </main>
  );
}
