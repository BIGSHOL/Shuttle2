"use client";

import { useEffect } from "react";

// 학부모 PWA 발판 — service worker 등록만 (push 구독은 W6).
// 실제 sw.js는 /public/sw.js. 등록 후 push 구독·VAPID 키 교환은 다음 세션.
export function SwRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // localhost·https 외에는 register 시도 안 함 (브라우저 정책)
    if (
      window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost"
    ) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => console.warn("sw register failed:", err));
  }, []);

  return null;
}
