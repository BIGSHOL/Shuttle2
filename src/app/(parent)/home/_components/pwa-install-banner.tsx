"use client";

import { Download, Share, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";

// W20-D2: 학부모 홈 상단 PWA 설치 안내 배너.
//
// Android Chrome: beforeinstallprompt 이벤트 → 자동 prompt 가능.
// iOS Safari: 이벤트 미발생 → "공유 → 홈화면에 추가" 안내만.
//
// 이미 standalone(설치됨)이거나 사용자가 X 닫음(localStorage)이면 표시 X.

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa-install-dismissed-at";
// 한 번 닫으면 30일 동안 다시 안 띄움.
const SUPPRESS_MS = 30 * 24 * 60 * 60 * 1000;

export function PwaInstallBanner() {
  const [bipEvent, setBipEvent] = useState<BIPEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [hidden, setHidden] = useState(true); // 초기는 숨김 (mount까지)

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 이미 standalone 모드(홈에서 진입)면 표시 안 함
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari standalone
      ("standalone" in window.navigator &&
        (window.navigator as { standalone?: boolean }).standalone === true);
    if (isStandalone) return;

    // 사용자가 30일 안에 닫았는지
    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt) {
        const ago = Date.now() - parseInt(dismissedAt, 10);
        if (ago < SUPPRESS_MS) return;
      }
    } catch {
      // localStorage 차단 환경 — 무시
    }

    // iOS Safari 감지 (beforeinstallprompt 미지원이지만 PWA 설치 가능)
    const ua = window.navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua) && !("MSStream" in window);
    const isSafari = isIos && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua);

    if (isSafari) {
      // microtask로 lift — react-hooks/set-state-in-effect 회피
      Promise.resolve().then(() => {
        setIosHint(true);
        setHidden(false);
      });
      return;
    }

    function onBip(e: Event) {
      e.preventDefault();
      setBipEvent(e as BIPEvent);
      setHidden(false);
    }
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (hidden) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      // ignore
    }
    setHidden(true);
  }

  async function install() {
    if (!bipEvent) return;
    await bipEvent.prompt();
    const choice = await bipEvent.userChoice;
    if (choice.outcome === "accepted") {
      setHidden(true);
    } else {
      dismiss();
    }
  }

  if (iosHint) {
    return (
      <div className="bg-bus-soft border-bus/30 mx-4 mt-3 rounded-lg border p-3 shadow-sm">
        <div className="flex items-start gap-2">
          <Smartphone className="text-bus mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold tracking-tight">
              홈 화면에 추가하면 더 빠르게 열 수 있어요
            </p>
            <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
              Safari 하단 <Share className="inline h-3 w-3" /> 버튼 → &quot;홈
              화면에 추가&quot;. 푸시 알림과 자녀 위치를 더 잘 받아볼 수 있어요.
            </p>
          </div>
          <button
            type="button"
            aria-label="배너 닫기"
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground -mr-1 -mt-1 p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bus-soft border-bus/30 mx-4 mt-3 rounded-lg border p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-bus text-bus-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
          <Download className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold tracking-tight">
            셔틀이를 앱처럼 사용하기
          </p>
          <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
            홈 화면에 추가하면 한 번 탭으로 열려요.
          </p>
        </div>
        <button
          type="button"
          onClick={install}
          className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-xs font-bold"
        >
          추가
        </button>
        <button
          type="button"
          aria-label="배너 닫기"
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground -mr-1 p-1"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
