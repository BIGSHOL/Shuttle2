// 학원장 dashboard에 표시되는 기사 앱 공유 카드.
// 클릭 시 다운로드 링크 + 가이드 URL을 클립보드에 복사 → 카카오톡으로
// 기사에게 전달. ("기사용 안드로이드 앱 다운로드" 한 단어로 즉시 인지)
"use client";

import { Share2, Copy, Check } from "lucide-react";
import { useState } from "react";

type Props = {
  apkUrl: string | null; // env.DRIVER_APP_LATEST_APK_URL
  helpUrl: string; // 절대 URL: https://shuttlee.kr/help/driver-app
};

export function DriverAppShareCard({ apkUrl, helpUrl }: Props) {
  const [copied, setCopied] = useState(false);

  const message = apkUrl
    ? `[셔틀이 기사 앱 안내]\n\n다운로드: ${apkUrl}\n설치 가이드: ${helpUrl}\n\n* 안드로이드 폰만 사용 가능\n* 처음 설치 시 "출처 알 수 없는 앱" 허용 필요`
    : `[셔틀이 기사 앱 안내]\n\n설치 가이드: ${helpUrl}\n\n* 안드로이드 폰만 사용 가능\n* APK 다운로드 링크는 학원장이 별도로 전달드립니다`;

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore — clipboard API 미지원 브라우저
    }
  }

  return (
    <section className="bg-card rounded-lg border p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="bg-bus-soft text-bus flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
          <Share2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-foreground text-sm font-extrabold">
            기사 앱(안드로이드) 공유
          </h3>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            기사용 RN 앱은 안드로이드 사이드로드로 배포됩니다. 아래 메시지를
            카카오톡으로 기사에게 보내세요.
          </p>
          <button
            type="button"
            onClick={copyMessage}
            className="mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-bold transition hover:bg-muted/50"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-success" />
                <span>복사됨</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>다운로드 + 가이드 링크 복사</span>
              </>
            )}
          </button>
          {!apkUrl ? (
            <p className="text-warning mt-2 text-[11px]">
              아직 APK 빌드 전입니다. 환경변수 DRIVER_APP_LATEST_APK_URL을
              설정하면 다운로드 링크가 포함됩니다.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
