// 셔틀이 기사 앱 (안드로이드 사이드로드 APK) 설치 가이드.
// 학원장이 기사에게 카카오톡으로 이 페이지 링크 + APK 다운로드 링크를 전달.
// PUBLIC 라우트 (middleware /help/* 통과).

/* eslint-disable react/no-unescaped-entities */

import Link from "next/link";

const APK_URL = process.env.DRIVER_APP_LATEST_APK_URL ?? "";

export const metadata = {
  title: "셔틀이 기사 앱 설치 — 셔틀이",
};

export default function DriverAppHelpPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 pt-8 pb-16">
      <header>
        <h1 className="text-foreground text-2xl font-extrabold tracking-tight">
          셔틀이 기사 앱 설치 가이드
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          안드로이드 폰을 쓰시는 기사님 전용입니다. iOS는 PWA(웹 화면)로 그대로
          사용해 주세요.
        </p>
      </header>

      <section className="bg-card rounded-lg border p-5">
        <h2 className="text-foreground text-lg font-bold">왜 별도 앱이 필요한가요?</h2>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          기사 폰은 운행 중 화면이 꺼지거나 다른 앱으로 전환되어도 GPS를
          학부모에게 계속 보내야 합니다. 안드로이드 전용 앱으로 만들어{" "}
          <strong className="text-foreground">화면이 꺼져도 5초마다 GPS가 송신</strong>
          되도록 했어요. 학부모가 셔틀 위치를 끊김 없이 볼 수 있습니다.
        </p>
      </section>

      <section className="bg-card rounded-lg border p-5">
        <h2 className="text-foreground text-lg font-bold">설치 5단계</h2>
        <ol className="text-muted-foreground mt-3 space-y-3 text-sm leading-6">
          <li>
            <strong className="text-foreground">1. APK 다운로드</strong>
            <br />
            아래 다운로드 버튼을 안드로이드 폰의 Chrome 브라우저로 누르세요.
            <br />
            {APK_URL ? (
              <a
                href={APK_URL}
                className="bg-bus text-bus-foreground mt-2 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-extrabold"
              >
                ↓ 셔틀이 기사 앱 다운로드
              </a>
            ) : (
              <span className="text-warning mt-2 inline-block text-xs">
                (학원장이 다운로드 링크를 카카오톡으로 보내드릴 거예요)
              </span>
            )}
          </li>
          <li>
            <strong className="text-foreground">2. "출처 알 수 없는 앱 설치" 허용</strong>
            <br />
            처음 설치 시 안드로이드가 묻습니다. "설정"으로 이동 → Chrome에 한해
            허용 → 뒤로가기.
          </li>
          <li>
            <strong className="text-foreground">3. Play Protect 경고 통과</strong>
            <br />
            "Play Protect가 차단했어요" 알림이 뜨면 "자세히 보기" → "무시하고
            설치"를 선택하세요. 학원장이 직접 검수한 셔틀이 공식 앱입니다.
          </li>
          <li>
            <strong className="text-foreground">4. 권한 허용</strong>
            <br />
            앱 첫 실행 시 위치(항상 허용), 알림 권한을 허용해 주세요. 운행 중
            폰을 가방에 넣어도 위치가 송신됩니다.
          </li>
          <li>
            <strong className="text-foreground">5. 배터리 최적화 제외</strong>
            <br />
            폰 종류에 따라 백그라운드 앱을 자동 종료하는 설정이 있습니다. 시스템
            설정 → "앱 정보" → 셔틀이 기사 → "배터리" → "제한 없음"으로 변경.
          </li>
        </ol>
      </section>

      <section className="bg-card rounded-lg border p-5">
        <h2 className="text-foreground text-lg font-bold">자주 묻는 질문</h2>
        <dl className="text-muted-foreground mt-3 space-y-3 text-sm leading-6">
          <div>
            <dt className="text-foreground font-bold">Play 스토어에 없나요?</dt>
            <dd className="mt-1">
              학원장 직접 배포(사이드로드) 방식입니다. 베타 단계에는 Play 스토어
              심사 없이 빠르게 배포·업데이트하기 위함이에요.
            </dd>
          </div>
          <div>
            <dt className="text-foreground font-bold">업데이트는 어떻게?</dt>
            <dd className="mt-1">
              앱 시작 시 새 버전이 있으면 자동으로 알림이 뜹니다. 한 번 누르면
              새 APK가 받아져요.
            </dd>
          </div>
          <div>
            <dt className="text-foreground font-bold">iOS 폰은요?</dt>
            <dd className="mt-1">
              iOS 기사님은 셔틀이 PWA를 그대로 사용합니다. 차량 거치대 + 충전기
              + 자동 잠금 OFF 설정이 필요해요.
            </dd>
          </div>
        </dl>
      </section>

      <div className="text-center">
        <Link href="/" className="text-muted-foreground text-xs underline">
          ← 셔틀이 홈으로
        </Link>
      </div>
    </main>
  );
}
