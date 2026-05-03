import Link from "next/link";
import { Bus, Check, ChevronRight, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const PLANS = [
  {
    name: "Lite",
    price: "차량당 ₩5,000",
    priceSubtitle: "월 정기 결제 / 차량당",
    desc: "안전운행기록 PDF만 필요한 학원·교습소",
    features: [
      { label: "안전운행기록 PDF 분기 추출", included: true },
      { label: "기본 운행 일지 (BoardingEvent)", included: true },
      { label: "최대 30명 학생", included: true },
      { label: "실시간 GPS 위치 공유", included: false },
      { label: "결석·정류장 변경 워크플로우", included: false },
      { label: "푸시 알림", included: false },
      { label: "일괄 알림 발송", included: false },
      { label: "API 연동", included: false },
    ],
    cta: "시작하기",
    ctaHref: "/signup?plan=lite",
    highlight: false,
  },
  {
    name: "Standard",
    price: "차량당 ₩9,000",
    priceSubtitle: "월 정기 결제 / 차량당",
    desc: "베타 참여 학원·어린이집 권장",
    features: [
      { label: "안전운행기록 PDF 분기 추출", included: true },
      { label: "기본 운행 일지", included: true },
      { label: "최대 100명 학생", included: true },
      { label: "실시간 GPS 위치 공유", included: true },
      { label: "결석·정류장 변경 워크플로우", included: true },
      { label: "푸시 알림 + 자녀 도착 푸시", included: true },
      { label: "일괄 알림 발송", included: false },
      { label: "API 연동", included: false },
    ],
    cta: "베타 신청",
    ctaHref: "/#pre-register",
    highlight: true,
    badge: "추천",
  },
  {
    name: "Pro",
    price: "맞춤 견적",
    priceSubtitle: "체인·다지점·기업 통근",
    desc: "다지점 통합 + 일괄 알림 + API",
    features: [
      { label: "안전운행기록 PDF 분기 추출", included: true },
      { label: "기본 운행 일지", included: true },
      { label: "학생 수 무제한", included: true },
      { label: "실시간 GPS 위치 공유", included: true },
      { label: "결석·정류장 변경 워크플로우", included: true },
      { label: "푸시 알림 + 자녀 도착 푸시", included: true },
      { label: "일괄 알림 + 예약 발송", included: true },
      { label: "API·CSV 연동 + 다지점 통합", included: true },
    ],
    cta: "문의하기",
    ctaHref: "mailto:hello@shuttlee.kr",
    highlight: false,
  },
];

const FAQS = [
  {
    q: "베타 기간 동안에는 무료인가요?",
    a: "네. 베타 참여 기관은 Standard 플랜을 무료로 사용하실 수 있고, 베타 종료 시점에 정식 요금제로 전환할지 결정하실 수 있습니다. 베타 종료 최소 2주 전에 안내드립니다.",
  },
  {
    q: "안전운행기록 PDF는 어떻게 만들어지나요?",
    a: "매 운행마다 기사가 입력하는 안전점검(좌석안전띠·동승보호자·전원하차) + 자동 누적되는 BoardingEvent를 합쳐 도로교통법 별지 제20호의2 양식에 맞게 분기 단위로 PDF를 추출합니다. 차량별·운행별 표 형식.",
  },
  {
    q: "기사가 안드로이드여야 하나요?",
    a: "권장합니다. iOS Safari는 백그라운드 GPS·화면 잠금 방지가 약해 운행 중 셔틀 위치가 끊길 수 있습니다. iPhone을 쓰는 기사는 거치대 + 충전기와 함께 운행 화면을 항상 켠 상태로 두시면 됩니다.",
  },
  {
    q: "학부모는 별도 앱 설치가 필요한가요?",
    a: "아닙니다. PWA로 동작해서 카카오·네이버 브라우저나 Safari·Chrome에서 “홈 화면에 추가”만 하면 됩니다. 푸시 알림은 Web Push로 받습니다 (iOS 16.4+ 지원).",
  },
  {
    q: "여러 자녀가 다른 학원에 다녀도 한 계정으로 볼 수 있나요?",
    a: "네. 한 학부모 계정에 여러 학원의 자녀를 연결할 수 있습니다. 각 학원에서 발급한 초대 링크를 통해 자녀를 추가하면 됩니다.",
  },
  {
    q: "데이터는 어디에 저장되나요?",
    a: "Supabase Cloud (서울 region) PostgreSQL. 위치 ping은 운행 시작~종료 사이에만 수집되고 운행 종료 즉시 GPS 송신을 중단합니다. 운행 데이터는 안전운행기록 의무 대응을 위해 분기 종료 후 최소 3년 보관합니다.",
  },
];

export default function PricingPage() {
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
                Shuttlee · 셔틀 운영 SaaS
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
      <section className="border-b py-16 lg:py-20">
        <div className="mx-auto max-w-3xl space-y-4 px-4 text-center lg:px-6">
          <span className="bg-bus-soft text-bus-foreground inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold tracking-wide">
            <Sparkles className="h-3.5 w-3.5" />
            베타 기간 Standard 무료
          </span>
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            요금제
          </h2>
          <p className="text-muted-foreground text-base font-medium sm:text-lg">
            차량 단위 월 구독. 안전운행기록만 필요하면 Lite, GPS·결석·푸시까지면
            Standard. 다지점·기업 통근은 Pro 맞춤.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={
                  p.highlight
                    ? "border-bus relative rounded-2xl border-2 p-6 shadow-md"
                    : "bg-card rounded-2xl border p-6 shadow-sm"
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
                  <span className="bg-bus text-bus-foreground absolute -top-3 right-5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-wide uppercase">
                    <Sparkles className="h-3 w-3" />
                    {p.badge}
                  </span>
                ) : null}
                <h3 className="text-lg font-extrabold tracking-tight">
                  {p.name}
                </h3>
                <p className="text-muted-foreground mt-1 text-xs font-medium">
                  {p.desc}
                </p>
                <p className="mt-4 text-3xl font-extrabold tracking-tight">
                  {p.price}
                </p>
                <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
                  {p.priceSubtitle}
                </p>
                <Button
                  asChild
                  className={
                    p.highlight
                      ? "bg-bus text-bus-foreground hover:bg-bus/90 mt-5 w-full font-extrabold"
                      : "mt-5 w-full font-bold"
                  }
                  variant={p.highlight ? "default" : "outline"}
                  size="lg"
                >
                  <Link href={p.ctaHref}>
                    {p.cta} <ChevronRight className="ml-0.5 h-4 w-4" />
                  </Link>
                </Button>
                <ul className="mt-6 space-y-2">
                  {p.features.map((f) => (
                    <li
                      key={f.label}
                      className={
                        f.included
                          ? "flex items-start gap-2 text-sm font-medium"
                          : "text-muted-foreground flex items-start gap-2 text-sm font-medium"
                      }
                    >
                      {f.included ? (
                        <Check className="text-success mt-0.5 h-4 w-4 shrink-0" />
                      ) : (
                        <X className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                      )}
                      <span className={f.included ? "" : "line-through"}>
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-y bg-muted/30 py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 lg:px-6">
          <div className="text-center">
            <p className="text-muted-foreground text-xs font-extrabold tracking-wide uppercase">
              자주 묻는 질문
            </p>
            <h3 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              FAQ
            </h3>
          </div>
          <div className="mt-10 space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="bg-card group rounded-2xl border p-5 shadow-sm"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-base font-extrabold tracking-tight">
                  {f.q}
                  <ChevronRight className="text-muted-foreground h-4 w-4 transition-transform group-open:rotate-90" />
                </summary>
                <p className="text-muted-foreground mt-3 text-sm font-medium leading-relaxed">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-3xl space-y-4 px-4 text-center lg:px-6">
          <h3 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            준비되셨다면 베타에 참여하세요
          </h3>
          <p className="text-muted-foreground text-base font-medium">
            기관 정보를 남겨주시면 순차적으로 베타 가이드를 안내드립니다.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="text-base font-extrabold">
              <Link href="/#pre-register">베타 신청하기</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="text-base font-bold"
            >
              <Link href="/signup">바로 시작하기</Link>
            </Button>
          </div>
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
              <Link href="/#pre-register" className="hover:text-foreground">
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
            © {new Date().getFullYear()} 셔틀이 (Shuttlee) · 도로교통법 §53⑦
            어린이통학버스 안전운행기록 의무 자동화.
          </p>
        </div>
      </footer>
    </main>
  );
}
