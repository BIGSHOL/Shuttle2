import Link from "next/link";
import { Bus } from "lucide-react";

import { Button } from "@/components/ui/button";

// 약관·개인정보처리방침 공용 shell. 마케팅 헤더 + 본문 + 푸터.
export function LegalShell({
  title,
  effectiveDate,
  badge,
  children,
}: {
  title: string;
  effectiveDate: string; // "2026-05-04"
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="bg-background min-h-screen">
      {/* 헤더 (랜딩과 동일) */}
      <header className="bg-background/80 sticky top-0 z-30 border-b backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="bg-bus text-bus-foreground flex h-8 w-8 items-center justify-center rounded-lg shadow-sm">
              <Bus className="h-4 w-4" />
            </span>
            <div>
              <h1 className="text-base font-extrabold tracking-tight">
                셔틀이
              </h1>
              <p className="text-muted-foreground text-[10px] font-medium">
                Shuttlee · 셔틀 운영 서비스
              </p>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Button asChild variant="ghost" size="sm">
              <Link href="/#features">기능</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/pricing">요금제</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/#pre-register">베타 신청</Link>
            </Button>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/login">로그인</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">시작하기</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b py-12 lg:py-16">
        <div className="mx-auto max-w-3xl space-y-3 px-4 text-center lg:px-6">
          {badge ? (
            <span className="bg-warning-soft text-warning inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold tracking-wide">
              {badge}
            </span>
          ) : null}
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {title}
          </h2>
          <p className="text-muted-foreground text-xs font-medium">
            시행일: {effectiveDate}
          </p>
        </div>
      </section>

      {/* 본문 */}
      <article className="mx-auto max-w-3xl px-4 py-10 lg:px-6 lg:py-14">
        {children}
      </article>

      {/* 푸터 */}
      <footer className="border-t py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="bg-bus text-bus-foreground flex h-7 w-7 items-center justify-center rounded-lg">
                <Bus className="h-3.5 w-3.5" />
              </span>
              <span className="text-base font-extrabold tracking-tight">
                셔틀이
              </span>
            </div>
            <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium">
              <Link href="/login" className="hover:text-foreground">
                로그인
              </Link>
              <Link href="/signup" className="hover:text-foreground">
                회원가입
              </Link>
              <Link href="/pricing" className="hover:text-foreground">
                요금제
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                이용약관
              </Link>
              <Link href="/privacy" className="hover:text-foreground">
                개인정보처리방침
              </Link>
            </div>
          </div>
          <p className="text-muted-foreground text-[11px] font-medium">
            © {new Date().getFullYear()} 셔틀이 (Shuttlee) · 도로교통법 §53⑦
            어린이통학버스 안전운행기록 의무 자동화.
          </p>
        </div>
      </footer>
    </main>
  );
}

// 본문 섹션 헬퍼
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 first:mt-0">
      <h3 className="text-lg font-extrabold tracking-tight">{title}</h3>
      <div className="text-foreground/90 mt-3 space-y-3 text-sm leading-relaxed font-medium">
        {children}
      </div>
    </section>
  );
}

export function LegalList({
  items,
  ordered = false,
}: {
  items: React.ReactNode[];
  ordered?: boolean;
}) {
  if (ordered) {
    return (
      <ol className="text-foreground/90 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed font-medium">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ol>
    );
  }
  return (
    <ul className="text-foreground/90 list-disc space-y-1.5 pl-5 text-sm leading-relaxed font-medium">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}
