// 셔틀이 service worker 발판 (W4-3).
// 본격 web-push 발송은 W6에서 VAPID 키 발급 + 서버 send 흐름으로.
// 지금은 (1) install·activate skip waiting, (2) push 수신 → 알림 표시,
// (3) 알림 클릭 → /home으로 포커스 — 만 동작하도록 한다.

self.addEventListener("install", () => {
  // 새 worker 활성화 즉시 클라이언트에 적용
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = { title: "셔틀이 알림", body: "" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // JSON 파싱 실패 시 default
  }

  const options = {
    body: payload.body || "",
    icon: "/icon.png",
    badge: "/icon.png",
    data: { url: payload.url || "/home" },
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/home";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
