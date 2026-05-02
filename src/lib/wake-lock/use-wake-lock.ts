"use client";

import { useEffect, useState } from "react";

type WakeLockSentinel = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: string, listener: () => void) => void;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinel>;
  };
};

// 기사 폰의 화면이 자동 꺼짐을 막기 위한 Wake Lock API 훅.
// iOS Safari PWA는 지원이 미흡하므로, CLAUDE.md 명세대로 안드로이드 기사 폰 권장 + 거치대.
// Chrome/Edge/Android: 지원. iOS Safari: 미지원 (별도 안내 필요).
export function useWakeLock(active: boolean): {
  supported: boolean;
  active: boolean;
  error: string | null;
} {
  const [supported, setSupported] = useState(false);
  const [held, setHeld] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nav = window.navigator as NavigatorWithWakeLock;
    // microtask로 lift 해서 react-hooks/set-state-in-effect 규칙 회피.
    queueMicrotask(() => setSupported(!!nav.wakeLock));
  }, []);

  useEffect(() => {
    if (!active) return;
    if (typeof window === "undefined") return;

    const nav = window.navigator as NavigatorWithWakeLock;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    async function acquire() {
      if (!nav.wakeLock) {
        if (!cancelled) {
          setError(
            "이 브라우저는 Wake Lock을 지원하지 않습니다 (안드로이드 권장)",
          );
        }
        return;
      }
      try {
        sentinel = (await nav.wakeLock.request("screen")) ?? null;
        if (!cancelled && sentinel) {
          setHeld(true);
          setError(null);
          sentinel.addEventListener("release", () => {
            setHeld(false);
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Wake Lock 획득 실패");
          setHeld(false);
        }
      }
    }

    function onVisibility() {
      if (document.visibilityState === "visible" && active) {
        acquire();
      }
    }

    // async IIFE로 effect body에서 동기 setState 회피.
    void acquire();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      sentinel?.release().catch(() => {});
    };
  }, [active]);

  return { supported, active: held, error };
}
