"use client";

import { useEffect } from "react";

// 공용 PWA service worker 등록. 학부모·기사·동승자·학원장 layout 모두 마운트.
// 실제 sw.js는 /public/sw.js. NotificationToggle 컴포넌트가 이 등록을
// 전제로 navigator.serviceWorker.ready를 기다리므로 모든 역할 layout에 필요.
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
