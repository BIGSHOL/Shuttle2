import Link from "next/link";
import {
  Bell,
  Bus,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileCheck,
  MapPin,
  Shield,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { PreRegisterForm } from "./pre-register-form";

const PAIN_POINTS = [
  {
    Icon: ClipboardCheck,
    title: "분기마다 운행기록 정리에 한 주",
    body: "법정 양식(별지 제20호의2)을 차량별·운행별로 직접 입력. 기록 누락 시 과태료 + 사고 시 면책 자료 부재.",
    tone: "destructive" as const,
  },
  {
    Icon: Smartphone,
    title: "학부모는 카톡으로 위치 문의",
    body: "기사·원장에게 “지금 어디예요?” 문자 빗발. 매일 같은 응대로 운영자 시간 소진.",
    tone: "warning" as const,
  },
  {
    Icon: Shield,
    title: "기존 셔틀 앱은 위치 끊김·답답한 화면",
    body: "기존 솔루션은 안정성 약하고, 안전운행기록 기능은 따로 또 입력. 이중 작업.",
    tone: "info" as const,
  },
];

const FEATURES = [
  {
    Icon: FileCheck,
    title: "안전운행기록 자동 생성",
    body: "매 운행마다 좌석안전띠·동승보호자·전원하차 체크가 자동 누적되어 분기마다 별지 제20호의2 PDF로 한 번에 추출.",
    tag: "법정 양식 자동",
  },
  {
    Icon: MapPin,
    title: "실시간 셔틀 위치",
    body: "기사 폰의 위치를 5초마다 학부모 앱에 전송. 카카오맵에 마커가 움직이고 다음 정류장 도착 예상 시각도 함께 표시.",
    tag: "실시간",
  },
  {
    Icon: Bus,
    title: "결석·정류장 변경 워크플로우",
    body: "학부모는 앱에서 결석 신청과 정류장 변경 요청. 학원장이 승인하면 기사·동승자에게 즉시 푸시.",
    tag: "셀프서비스",
  },
  {
    Icon: Bell,
    title: "정류장 도착 푸시 알림",
    body: "자녀 정류장 반경 도달 시 학부모에게 자동 푸시. 미탑승·미하차 발생 시 학부모·학원에 즉시 경고.",
    tag: "푸시 알림",
  },
];

const COMPARISON = [
  { feature: "안전운행기록 PDF 자동", us: true, others: false },
  { feature: "실시간 위치 공유", us: true, others: true },
  { feature: "결석 신청 자동 매칭", us: true, others: false },
  { feature: "정류장 변경 요청 워크플로우", us: true, others: false },
  { feature: "푸시 알림 (브라우저 표준)", us: true, others: true },
  { feature: "어린이용 모드 전용 안전점검", us: true, others: false },
  { feature: "분기 안전운행기록 별지 제20호의2", us: true, others: false },
  { feature: "다회 학원 자녀 1계정", us: true, others: false },
];

const PLAN_HIGHLIGHTS = [
  {
    name: "라이트",
    price: "차량당 ₩5,000",
    desc: "안전운행기록 PDF만 필요한 기관",
    features: ["안전운행기록 PDF 분기 추출", "기본 운행 일지", "최대 30명"],
    cta: "시작하기",
    highlight: false,
  },
  {
    name: "스탠다드",
    price: "차량당 ₩9,000",
    desc: "베타 참여 학원·어린이집 권장",
    features: [
      "라이트 전체 +",
      "실시간 위치 공유",
      "결석·정류장 변경 워크플로우",
      "푸시 알림 + 자녀 도착 푸시",
      "최대 100명",
    ],
    cta: "베타 신청",
    highlight: true,
    badge: "추천",
  },
  {
    name: "프로",
    price: "맞춤 견적",
    desc: "체인·다지점·기업 통근",
    features: [
      "스탠다드 전체 +",
      "일괄 알림 + 예약 발송",
      "다지점 통합 dashboard",
      "API·CSV 연동",
      "학생 수 무제한",
    ],
    cta: "문의하기",
    highlight: false,
  },
];

export default function MarketingPage() {
  return (
    <main className="bg-background min-h-screen">
      {/* 헤더 */}
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
              <Link href="#features">기능</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/pricing">요금제</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/help">도움말</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="#pre-register">베타 신청</Link>
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
      <section className="relative overflow-hidden">
        <div className="bg-gradient-to-b from-bus/12 via-bus/4 to-transparent absolute inset-0 -z-10" />
        <div className="bg-bus/15 absolute -top-32 -right-20 -z-10 h-96 w-96 rounded-full blur-3xl" />
        <div className="bg-info/10 absolute -bottom-40 -left-20 -z-10 h-96 w-96 rounded-full blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24 lg:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-6">
              <span className="bg-bus text-bus-foreground inline-flex items-center gap-1.5 rounded-full border-2 border-bus-foreground/15 px-3 py-1.5 text-xs font-black tracking-tight shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                법정 의무 + 학부모 만족 한 번에
              </span>
              <h2 className="text-4xl font-black tracking-tighter sm:text-5xl lg:text-[64px] leading-[1.05]">
                셔틀버스 운영,
                <br />
                <span className="text-bus-foreground bg-bus inline-block rounded-lg px-2">
                  이젠 가볍게
                </span>
                .
              </h2>
              <p className="text-muted-foreground max-w-xl text-base font-medium leading-relaxed sm:text-lg">
                매 운행 자동 누적되는 안전점검·운행 기록을 분기마다 PDF로
                추출하고, 학부모는 카카오맵에서 셔틀 위치를 실시간으로 봅니다.
                어린이통학버스 안전운행기록 의무를 자동으로 충족시키는 셔틀 운영 서비스.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="text-base font-black tracking-tight bg-bus text-bus-foreground hover:bg-bus/90 shadow-[var(--shadow-live)] h-12 px-6 border-2 border-bus-foreground/10"
                >
                  <Link href="#pre-register">
                    베타 신청 <ChevronRight className="ml-0.5 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="text-base font-extrabold tracking-tight h-12 px-6 border-2"
                >
                  <Link href="/pricing">요금제 보기</Link>
                </Button>
              </div>
              {/* 소셜프루프 stat strip */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <p className="text-2xl font-black tracking-tight tabular-nums">
                    2
                  </p>
                  <p className="text-muted-foreground text-[11px] font-semibold mt-0.5">
                    베타 운영 기관
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-black tracking-tight tabular-nums">
                    5초
                  </p>
                  <p className="text-muted-foreground text-[11px] font-semibold mt-0.5">
                    위치 갱신 주기
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-black tracking-tight tabular-nums">
                    PDF
                  </p>
                  <p className="text-muted-foreground text-[11px] font-semibold mt-0.5">
                    분기 자동 추출
                  </p>
                </div>
              </div>
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium">
                <span className="inline-flex items-center gap-1">
                  <Check className="text-success h-3.5 w-3.5" />
                  앱 설치 없이 바로 사용
                </span>
                <span className="inline-flex items-center gap-1">
                  <Check className="text-success h-3.5 w-3.5" />
                  학원 1곳 + 어린이집 1곳 베타 운영 중
                </span>
                <span className="inline-flex items-center gap-1">
                  <Check className="text-success h-3.5 w-3.5" />
                  카카오맵 정식 연동
                </span>
              </div>
            </div>

            {/* 모바일 mock */}
            <div className="relative">
              <div className="bg-card relative mx-auto max-w-sm rounded-[36px] border-[10px] border-zinc-900 p-3 shadow-2xl rotate-[1.5deg] hover:rotate-0 transition-transform duration-500">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-1.5 w-16 bg-zinc-900 rounded-b-lg" />
                <div className="bg-muted/40 rounded-lg p-4">
                  <div className="bg-card mb-3 rounded-md border p-3 shadow-sm">
                    <p className="text-muted-foreground text-[10px] font-extrabold tracking-wide uppercase">
                      운행 중
                    </p>
                    <p className="mt-0.5 text-base font-extrabold">
                      등원 1코스 · 김ㅇㅇ
                    </p>
                  </div>
                  <div
                    className="relative mb-3 overflow-hidden rounded-md p-4 text-white"
                    style={{
                      background: "linear-gradient(155deg, #1a1c22, #0f1014)",
                    }}
                  >
                    <div className="bg-bus absolute inset-x-0 top-0 h-[3px]" />
                    <div className="flex items-center gap-2">
                      <span className="bg-bus text-bus-foreground inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide uppercase">
                        <span className="bg-bus-foreground inline-block h-1 w-1 animate-pulse rounded-full" />
                        운행 중
                      </span>
                      <span className="text-[9px] font-bold opacity-70">
                        다음 정류장까지
                      </span>
                    </div>
                    <p className="mt-1 text-3xl font-extrabold tracking-tight">
                      약 4분
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium opacity-70">
                      ○○아파트 정문 · 5번째 정류장
                    </p>
                  </div>
                  <div className="bg-card flex items-center gap-2 rounded-md border p-2.5 shadow-sm">
                    <span className="bg-success-soft text-success flex h-7 w-7 items-center justify-center rounded-full">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-extrabold">탑승 완료</p>
                      <p className="text-muted-foreground text-[10px] font-medium">
                        ○○아파트 후문 · 08:42
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-bus-soft absolute -top-4 -right-4 -z-10 h-32 w-32 rounded-full blur-2xl" />
              <div className="bg-info-soft absolute -bottom-4 -left-4 -z-10 h-32 w-32 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Pain points */}
      <section className="border-y bg-muted/30 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl space-y-10 px-4 lg:px-6">
          <div className="text-center">
            <p className="text-muted-foreground text-[11px] font-black tracking-[0.15em] uppercase">
              왜 만들었나요
            </p>
            <h3 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl leading-tight">
              현재 운영자들의 진짜 부담
            </h3>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {PAIN_POINTS.map((p) => {
              const t =
                p.tone === "destructive"
                  ? "bg-destructive/10 text-destructive"
                  : p.tone === "warning"
                    ? "bg-warning-soft text-warning"
                    : "bg-info-soft text-info";
              return (
                <div
                  key={p.title}
                  className="bg-card rounded-2xl border p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 border-current/15 ${t}`}
                  >
                    <p.Icon className="h-5 w-5" />
                  </span>
                  <h4 className="mt-4 text-lg font-black tracking-tight leading-tight">
                    {p.title}
                  </h4>
                  <p className="text-muted-foreground mt-2 text-sm font-medium leading-relaxed">
                    {p.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 lg:py-20">
        <div className="mx-auto max-w-6xl space-y-10 px-4 lg:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-muted-foreground text-xs font-extrabold tracking-wide uppercase">
              핵심 기능
            </p>
            <h3 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              안전 + 알림, 두 축을 자동화
            </h3>
            <p className="text-muted-foreground mt-3 text-base font-medium">
              어린이용 모드 차량은 법정 안전운행 의무를 자동 충족하고, 모든
              차량은 학부모 실시간 알림을 기본 제공합니다.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-card rounded-2xl border p-6 shadow-sm hover:shadow-md hover:border-foreground/20 transition-all"
              >
                <div className="flex items-start gap-3">
                  <span className="bg-bus-soft text-bus-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-bus/15">
                    <f.Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-black tracking-tight">
                        {f.title}
                      </h4>
                      <span className="bg-bus text-bus-foreground rounded-full px-2 py-0.5 text-[10px] font-black tracking-tight uppercase">
                        {f.tag}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-2 text-sm font-medium leading-relaxed">
                      {f.body}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="border-y bg-muted/30 py-16 lg:py-20">
        <div className="mx-auto max-w-4xl space-y-8 px-4 lg:px-6">
          <div className="text-center">
            <p className="text-muted-foreground text-[11px] font-black tracking-[0.15em] uppercase">
              차별점
            </p>
            <h3 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl leading-tight">
              셔틀이 vs 기존 솔루션
            </h3>
          </div>
          <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-extrabold tracking-wide uppercase">
                    기능
                  </th>
                  <th className="bg-bus-soft px-4 py-3 text-center text-xs font-extrabold tracking-wide uppercase">
                    셔틀이
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-center text-xs font-extrabold tracking-wide uppercase">
                    기존 솔루션
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {COMPARISON.map((row) => (
                  <tr key={row.feature}>
                    <td className="px-4 py-3 font-bold">{row.feature}</td>
                    <td className="bg-bus-soft/40 px-4 py-3 text-center">
                      {row.us ? (
                        <Check className="text-success mx-auto h-4 w-4" />
                      ) : (
                        <X className="text-muted-foreground mx-auto h-4 w-4" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.others ? (
                        <Check className="text-success mx-auto h-4 w-4 opacity-50" />
                      ) : (
                        <X className="text-muted-foreground mx-auto h-4 w-4" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing summary */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-6xl space-y-10 px-4 lg:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-muted-foreground text-[11px] font-black tracking-[0.15em] uppercase">
              요금제
            </p>
            <h3 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl leading-tight">
              필요한 만큼만
            </h3>
            <p className="text-muted-foreground mt-3 text-base font-medium">
              안전운행기록만 필요하면 라이트, 위치·결석까지면 스탠다드, 다지점은
              프로. 베타 기간 동안 스탠다드 무료 체험.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {PLAN_HIGHLIGHTS.map((p) => (
              <div
                key={p.name}
                className={
                  p.highlight
                    ? "border-bus relative rounded-2xl border-2 p-7 shadow-lg lg:scale-105"
                    : "bg-card rounded-2xl border p-6 shadow-sm hover:shadow-md transition-shadow"
                }
                style={
                  p.highlight
                    ? {
                        background:
                          "linear-gradient(155deg, var(--card), var(--bus-soft))",
                      }
                    : undefined
                }
              >
                {p.badge ? (
                  <span className="bg-bus text-bus-foreground absolute -top-3 right-5 inline-flex items-center gap-1 rounded-full border-2 border-bus-foreground/15 px-3 py-1 text-[11px] font-black tracking-tight uppercase shadow-sm">
                    <Sparkles className="h-3 w-3" />
                    {p.badge}
                  </span>
                ) : null}
                <h4 className="text-xl font-black tracking-tight">{p.name}</h4>
                <p className="text-muted-foreground mt-1 text-xs font-semibold">
                  {p.desc}
                </p>
                <p className="mt-5 text-3xl font-black tracking-tighter tabular-nums">
                  {p.price}
                </p>
                <ul className="mt-4 space-y-1.5">
                  {p.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm font-medium"
                    >
                      <Check className="text-success mt-0.5 h-4 w-4 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className={
                    p.highlight
                      ? "bg-bus text-bus-foreground hover:bg-bus/90 mt-6 w-full font-extrabold"
                      : "mt-6 w-full font-bold"
                  }
                  variant={p.highlight ? "default" : "outline"}
                >
                  <Link href="#pre-register">{p.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Button asChild variant="ghost" size="sm">
              <Link href="/pricing">
                전체 요금제 비교 <ChevronRight className="ml-0.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Pre-register CTA */}
      <section
        id="pre-register"
        className="border-y bg-gradient-to-b from-muted/30 to-bus-soft/40 py-16 lg:py-20 relative overflow-hidden"
      >
        <div className="bg-bus/10 absolute -top-20 right-1/4 h-72 w-72 rounded-full blur-3xl" />
        <div className="bg-info/8 absolute -bottom-20 left-1/4 h-72 w-72 rounded-full blur-3xl" />
        <div className="mx-auto max-w-2xl space-y-6 px-4 lg:px-6 relative">
          <div className="text-center">
            <span className="bg-bus text-bus-foreground inline-flex items-center gap-1.5 rounded-full border-2 border-bus-foreground/15 px-3 py-1.5 text-xs font-black tracking-tight shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              베타 모집 중
            </span>
            <h3 className="mt-4 text-4xl font-black tracking-tighter sm:text-5xl leading-tight">
              베타 사전등록
            </h3>
            <p className="text-muted-foreground mt-3 text-base font-medium">
              현재 학원 1곳 + 어린이집 1곳에서 베타 운영 중. 추가 베타 참가는
              순차적으로 안내드립니다.
            </p>
          </div>
          <PreRegisterForm />
        </div>
      </section>

      {/* Footer */}
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
              <Link href="#pre-register" className="hover:text-foreground">
                베타 신청
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
            © {new Date().getFullYear()} 셔틀이 (Shuttlee) · 셔틀버스 운영
            서비스
          </p>
        </div>
      </footer>
    </main>
  );
}
