"use client";

import { Bell, BellOff, Check, Info } from "lucide-react";
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
  compact = false,
}: {
  vapidPublicKey: string;
  saveAction: SubscribeAction;
  removeAction: RemoveAction;
  label?: string;
  helpText?: string;
  // W26: header 인라인용 작은 pill — subscribed/unsubscribed 상태에서 단일 줄
  // outline 버튼. 자세한 설명·아이콘 큰 카드는 default(false).
  compact?: boolean;
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
        console.error("[notification-toggle] init failed", err);
        if (!cancelled)
          setStatus({
            kind: "error",
            message: "알림 상태 확인에 실패했어요. 잠시 후 다시 시도해 주세요.",
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
        console.error("[notification-toggle] subscribe failed", err);
        setStatus({
          kind: "error",
          message: "알림 등록에 실패했어요. 잠시 후 다시 시도해 주세요.",
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
        console.error("[notification-toggle] unsubscribe failed", err);
        setStatus({
          kind: "error",
          message: "알림 해제에 실패했어요. 잠시 후 다시 시도해 주세요.",
        });
      }
    });
  };

  // 기본 카드 wrapper — 상태별 다른 톤
  const wrapper = "bg-card flex items-start gap-3 rounded-lg border p-3.5 shadow-sm";

  if (status.kind === "loading") {
    return (
      <div className={wrapper}>
        <span className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
          <Bell className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold">알림 상태 확인 중...</p>
        </div>
      </div>
    );
  }

  if (status.kind === "unsupported") {
    return (
      <div className={wrapper}>
        <span className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
          <BellOff className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold">알림 미지원 브라우저</p>
          <p className="text-muted-foreground mt-0.5 text-xs font-medium">
            iOS는 홈 화면에 추가 (PWA 설치) 후 가능합니다.
          </p>
        </div>
      </div>
    );
  }

  if (status.kind === "denied") {
    return (
      <div className="border-warning/30 bg-warning-soft/40 flex items-start gap-3 rounded-lg border p-3.5 shadow-sm">
        <span className="bg-warning text-warning-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
          <BellOff className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold">알림 권한 차단됨</p>
          <p className="text-muted-foreground mt-0.5 text-xs font-medium">
            브라우저 설정에서 “알림 → 허용”으로 바꿔주세요.
          </p>
        </div>
      </div>
    );
  }

  if (status.kind === "subscribed") {
    if (compact) {
      // header 인라인용 — 단일 줄 outline pill
      return (
        <div className="border-success/40 bg-success-soft/60 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5">
          <Check className="text-success h-3.5 w-3.5" />
          <span className="text-success text-[11px] font-extrabold">
            알림 받는 중
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-success hover:bg-success/10 -mr-1.5 h-5 px-1.5 text-[10px] font-bold"
            onClick={unsubscribe}
            disabled={pending}
          >
            {pending ? "..." : "해제"}
          </Button>
        </div>
      );
    }
    return (
      <div className="border-success/30 bg-success-soft/40 flex items-start gap-3 rounded-lg border p-3.5 shadow-sm">
        <span className="bg-success text-success-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
          <Check className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-extrabold">알림 받는 중</p>
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
          </div>
          {helpText ? (
            <p className="text-muted-foreground mt-0.5 text-xs font-medium">
              {helpText}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  // unsubscribed (또는 error)
  if (compact) {
    // header 인라인용 — 단일 줄 노란 outline pill
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-bus/40 text-bus-foreground bg-bus-soft hover:bg-bus/20 h-8 gap-1.5 px-2.5 text-[11px] font-extrabold"
        onClick={subscribe}
        disabled={pending}
      >
        <Bell className="h-3.5 w-3.5" />
        {pending ? "구독 중..." : "알림 켜기"}
      </Button>
    );
  }
  return (
    <div className="border-bus/40 bg-bus-soft/40 flex items-start gap-3 rounded-lg border p-3.5 shadow-sm">
      <span className="bg-bus text-bus-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
        <Bell className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="text-sm font-extrabold">{label}</p>
          {helpText ? (
            <p className="text-muted-foreground mt-0.5 text-xs font-medium">
              {helpText}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          className="bg-bus text-bus-foreground hover:bg-bus/90 font-extrabold"
          onClick={subscribe}
          disabled={pending}
        >
          {pending ? "구독 중..." : "알림 켜기"}
        </Button>
        {status.kind === "error" ? (
          <p className="text-destructive inline-flex items-center gap-1 text-xs font-medium">
            <Info className="h-3 w-3" />
            {status.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
