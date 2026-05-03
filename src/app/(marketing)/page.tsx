import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { PreRegisterForm } from "./pre-register-form";

export default function MarketingPage() {
  return (
    <main className="bg-background min-h-screen">
      {/* 헤더 */}
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <div>
            <h1 className="text-lg font-semibold">셔틀이</h1>
            <p className="text-muted-foreground text-xs">
              학원·어린이집·유치원 셔틀버스 운영 SaaS
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/login">로그인</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">회원가입</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="space-y-6 text-center">
          <h2 className="text-3xl font-bold sm:text-5xl">
            도교법 의무도, 학부모 알림도
            <br />한 번에 끝내는 셔틀버스 운영
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-base sm:text-lg">
            매 운행 자동 누적되는 안전점검·운행 기록을 분기마다 PDF로
            제출하고, 학부모는 카카오맵에서 셔틀 위치를 실시간으로 확인합니다.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="#pre-register">베타 사전등록</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/signup">바로 시작하기</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 가치 두 축 */}
      <section className="bg-muted/40 border-y py-16">
        <div className="mx-auto max-w-6xl space-y-8 px-4">
          <div className="text-center">
            <h3 className="text-2xl font-semibold">셔틀이가 해결하는 문제</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              어린이통학버스 운영자의 두 가지 큰 부담을 동시에 덜어드립니다.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  📋 분기 안전운행기록 자동 생성
                </CardTitle>
                <CardDescription>
                  도로교통법 §53⑦ 별지 제20호의2 서식을 매 운행 자동 누적된
                  안전점검·동승·하차 데이터로 분기마다 PDF로 한 번에 제출.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                미제출 시 과태료 면제, 사고 시 면책 자료로 활용. 차량별 운행
                기록을 표로 정리해 관할 경찰서 제출용 양식에 맞춥니다.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  📍 학부모 실시간 셔틀 위치
                </CardTitle>
                <CardDescription>
                  기사 폰 GPS가 셔틀 위치를 5초마다 학부모 앱에 보내고,
                  카카오맵에 셔틀 마커가 움직입니다. 다음 정류장까지 ETA
                  표시.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                자녀 정류장에 셔틀이 도착하면 학부모에게 자동 푸시 알림.
                결석 신청도 학부모 앱에서 한 번에.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 누구를 위한 도구 */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="space-y-8">
          <div className="text-center">
            <h3 className="text-2xl font-semibold">이런 분들께 권합니다</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">학원·교습소</CardTitle>
                <CardDescription>
                  보습·예체능·입시 학원의 등하원 셔틀
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">어린이집·유치원</CardTitle>
                <CardDescription>
                  영유아 통학 차량 (KIDS 모드 의무 풀세트)
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">기업 통근버스</CardTitle>
                <CardDescription>
                  GENERAL 모드 — 출결·알림 중심 (W12 이후 확장)
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* 사전등록 */}
      <section id="pre-register" className="bg-muted/40 border-t py-16">
        <div className="mx-auto max-w-2xl space-y-6 px-4">
          <div className="text-center">
            <h3 className="text-2xl font-semibold">베타 사전등록</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              현재 학원 1곳 + 어린이집 1곳에서 베타 운영 중. 추가 베타
              참가를 원하시면 아래 폼을 남겨주시면 순차적으로 연락드립니다.
            </p>
          </div>
          <PreRegisterForm />
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t py-8">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 text-xs">
          <p>© {new Date().getFullYear()} 셔틀이</p>
          <div className="flex gap-3">
            <Link href="/login" className="hover:underline">
              로그인
            </Link>
            <Link href="/signup" className="hover:underline">
              회원가입
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
