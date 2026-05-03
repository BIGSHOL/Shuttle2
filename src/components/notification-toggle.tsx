"use client";

import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

// VAPID public key (urlBase64) → Uint8Array<ArrayBuffer>.
// applicationServerKey가 BufferSource(ArrayBufferView<ArrayBuffer>) 요구하므로
// 명시적으로 ArrayBuffer로 backed된 Uint8Array를 만든다.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type SubscribeAction = (raw: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}) => Promise<{ ok: true } | { error: string }>;

type RemoveAction = (endpoint: string) => Promise<void>;

type Status =
  | { kind: "loading" }
  | { kind: "unsupported" }
  | { kind: "denied" }
  | { kind: "subscribed"; endpoint: string }
  | { kind: "unsubscribed" }
  | { kind: "error"; message: string };

// 학부모·OWNER 공용 push 알림 토글. 권한 요청 + service worker subscribe +
// server action으로 endpoint·키 저장. 해제도 같은 자리에서.
export function NotificationToggle({
  vapidPublicKey,
  saveAction,
  removeAction,
  label = "알림 받기",
  helpText,
}: {
  vapidPublicKey: string;
  saveAction: SubscribeAction;
  removeAction: RemoveAction;
  label?: string;
  helpText?: string;
}) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [pending, startTransition] = useTransition();

  // 마운트 시 현재 구독 상태 파악
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (typeof window === "undefined") return;
        if (
          !("serviceWorker" in navigator) ||
          !("PushManager" in window) ||
          !("Notification" in window)
        ) {
          if (!cancelled) setStatus({ kind: "unsupported" });
          return;
        }
        // Notification.permission 우선 체크
        if (Notification.permission === "denied") {
          if (!cancelled) setStatus({ kind: "denied" });
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) {
          setStatus(
            sub
              ? { kind: "subscribed", endpoint: sub.endpoint }
              : { kind: "unsubscribed" },
          );
        }
      } catch (err) {
        if (!cancelled)
          setStatus({
            kind: "error",
            message: err instanceof Error ? err.message : "알 수 없는 오류",
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = () => {
    startTransition(async () => {
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          setStatus({ kind: "denied" });
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
        const json = sub.toJSON() as {
          endpoint: string;
          keys: { p256dh: string; auth: string };
        };
        const r = await saveAction({
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          userAgent:
            typeof navigator !== "undefined"
              ? navigator.userAgent.slice(0, 500)
              : undefined,
        });
        if ("error" in r) {
          setStatus({ kind: "error", message: r.error });
          await sub.unsubscribe().catch(() => {});
          return;
        }
        setStatus({ kind: "subscribed", endpoint: sub.endpoint });
      } catch (err) {
        setStatus({
          kind: "error",
          message: err instanceof Error ? err.message : "구독에 실패했어요",
        });
      }
    });
  };

  const unsubscribe = () => {
    startTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          const ep = sub.endpoint;
          await sub.unsubscribe();
          await removeAction(ep);
        }
        setStatus({ kind: "unsubscribed" });
      } catch (err) {
        setStatus({
          kind: "error",
          message: err instanceof Error ? err.message : "해제 실패",
        });
      }
    });
  };

  if (status.kind === "loading") {
    return (
      <div className="text-muted-foreground text-xs">알림 상태 확인 중...</div>
    );
  }

  if (status.kind === "unsupported") {
    return (
      <div className="text-muted-foreground text-xs">
        이 브라우저는 푸시 알림을 지원하지 않습니다 (iOS는 PWA 설치 후 가능).
      </div>
    );
  }

  if (status.kind === "denied") {
    return (
      <div className="text-amber-700 text-xs">
        알림 권한이 차단됐습니다. 브라우저 설정에서 허용으로 바꿔주세요.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {status.kind === "subscribed" ? (
          <>
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs">알림 받는 중</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={unsubscribe}
              disabled={pending}
            >
              {pending ? "..." : "해제"}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={subscribe}
            disabled={pending}
          >
            {pending ? "구독 중..." : `🔔 ${label}`}
          </Button>
        )}
        {status.kind === "error" ? (
          <span className="text-destructive text-xs">{status.message}</span>
        ) : null}
      </div>
      {helpText && status.kind !== "subscribed" ? (
        <p className="text-muted-foreground text-xs">{helpText}</p>
      ) : null}
    </div>
  );
}
