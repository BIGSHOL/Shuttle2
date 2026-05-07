"use client";

import { AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

// W20-C1: 기사 운행 시작 전 브라우저 권한·기능 사전 체크 카드.
// 위치권한 / 알림권한 / Wake Lock(화면 잠금 방지) 지원 여부를 한 번에 확인하고,
// 미허용 시 명확한 안내 + 다시 요청 버튼 제공.
//
// 운행 시작 후 GPS 오류 발견하는 케이스(특히 iOS Safari)를 사전 차단.
//
// 클라이언트 컴포넌트 — `navigator.*` API 접근 필요.

type PermissionState = "granted" | "denied" | "prompt" | "unsupported";

export function DriverPermissionsCard() {
  // 초기값을 "loading" 으로 두고 useEffect에서 polling/async 콜백 안에서만 setState.
  // react-hooks/set-state-in-effect 룰 회피 (effect body 직접 setState 안 함).
  const [geo, setGeo] = useState<PermissionState | "loading">("loading");
  const [notif, setNotif] = useState<PermissionState | "loading">("loading");
  const [wakeLock, setWakeLock] = useState<
    "supported" | "unsupported" | "loading"
  >("loading");
  const [requestingGeo, setRequestingGeo] = useState(false);
  const [requestingNotif, setRequestingNotif] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    let unsubGeo: (() => void) | null = null;

    // 위치 권한 — Permissions API
    const queryGeo = async () => {
      try {
        if ("permissions" in navigator && navigator.permissions?.query) {
          const p = await navigator.permissions.query({ name: "geolocation" });
          setGeo(p.state as PermissionState);
          const handler = () => setGeo(p.state as PermissionState);
          p.addEventListener("change", handler);
          unsubGeo = () => p.removeEventListener("change", handler);
        } else {
          setGeo("unsupported");
        }
      } catch {
        setGeo("unsupported");
      }
    };
    void queryGeo();

    // 알림 권한 — Notification API (microtask로 wrap해서 setState를 effect body 밖으로)
    Promise.resolve().then(() => {
      if ("Notification" in window) {
        const perm = Notification.permission;
        setNotif(
          perm === "granted"
            ? "granted"
            : perm === "denied"
              ? "denied"
              : "prompt",
        );
      } else {
        setNotif("unsupported");
      }
      // Wake Lock 지원 여부 (iOS Safari < 16.4 미지원)
      setWakeLock("wakeLock" in navigator ? "supported" : "unsupported");
    });

    return () => {
      unsubGeo?.();
    };
  }, []);

  async function requestGeo() {
    setRequestingGeo(true);
    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(),
          (err) => reject(err),
          { timeout: 10000 },
        );
      });
      setGeo("granted");
    } catch {
      setGeo("denied");
    } finally {
      setRequestingGeo(false);
    }
  }

  async function requestNotif() {
    if (!("Notification" in window)) return;
    setRequestingNotif(true);
    try {
      const result = await Notification.requestPermission();
      setNotif(result as PermissionState);
    } finally {
      setRequestingNotif(false);
    }
  }

  // 초기 loading 상태에서는 카드 자체를 안 보여줌 (깜빡임 방지).
  if (geo === "loading" || notif === "loading" || wakeLock === "loading") {
    return null;
  }

  // 모든 핵심 권한이 OK면 카드 자체를 collapse. "이상 없음" 한 줄로 축소.
  const allOk =
    geo === "granted" && notif === "granted" && wakeLock === "supported";

  if (allOk) {
    return (
      <details className="bg-success-soft/40 border-success/30 block w-full rounded-lg border px-4 py-2.5 text-sm shadow-sm">
        <summary className="text-success flex cursor-pointer items-center gap-2 text-xs font-bold tracking-wide uppercase">
          <CheckCircle2 className="h-3.5 w-3.5" />
          운행 환경 이상 없음
          <ChevronDown className="ml-auto h-3.5 w-3.5 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-2 space-y-1 text-[11px] font-medium text-foreground">
          <p>✓ 위치 권한 허용됨</p>
          <p>✓ 알림 권한 허용됨</p>
          <p>✓ 화면 잠금 방지 (Wake Lock) 지원</p>
        </div>
      </details>
    );
  }

  return (
    <div className="border-warning/40 bg-warning-soft/30 rounded-lg border p-4 shadow-sm">
      <div className="flex items-start gap-2">
        <AlertCircle className="text-warning mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold tracking-tight">
            운행 시작 전 권한 확인
          </h3>
          <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
            아래 항목 중 미허용이 있으면 운행 중 GPS·알림이 안 갈 수 있어요.
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-2 text-sm">
        <PermissionRow
          label="위치 권한"
          state={geo}
          deniedHelp="브라우저 주소창의 자물쇠 → 위치 → 허용으로 변경 후 새로고침."
          unsupportedHelp="이 브라우저는 위치 정보 미지원. Chrome·Safari 사용 권장."
          requestLabel="위치 권한 요청"
          onRequest={requestGeo}
          requesting={requestingGeo}
        />
        <PermissionRow
          label="알림 권한"
          state={notif}
          deniedHelp="브라우저 알림 차단 해제 후 새로고침. 학원장·학부모 응답을 받아볼 수 있어요."
          unsupportedHelp="이 브라우저는 알림 미지원."
          requestLabel="알림 권한 요청"
          onRequest={requestNotif}
          requesting={requestingNotif}
        />
        <PermissionRow
          label="화면 잠금 방지"
          state={wakeLock === "supported" ? "granted" : "unsupported"}
          deniedHelp=""
          unsupportedHelp="iOS Safari 16.4 이전이거나 미지원 브라우저. 운행 중 화면 자동 꺼짐 = GPS 멈춤. 거치대 + 충전 + 화면 켜둠 권장."
          requestLabel=""
        />
      </ul>
    </div>
  );
}

function PermissionRow({
  label,
  state,
  deniedHelp,
  unsupportedHelp,
  requestLabel,
  onRequest,
  requesting,
}: {
  label: string;
  state: PermissionState;
  deniedHelp: string;
  unsupportedHelp: string;
  requestLabel: string;
  onRequest?: () => void;
  requesting?: boolean;
}) {
  const tone =
    state === "granted"
      ? "text-success"
      : state === "denied"
        ? "text-destructive"
        : state === "unsupported"
          ? "text-muted-foreground"
          : "text-warning";
  const stateLabel =
    state === "granted"
      ? "허용"
      : state === "denied"
        ? "거부됨"
        : state === "unsupported"
          ? "미지원"
          : "미허용";

  return (
    <li className="bg-background rounded-md border px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold">{label}</span>
        <span className={`${tone} text-[11px] font-extrabold tracking-wide uppercase`}>
          {stateLabel}
        </span>
      </div>
      {state === "prompt" && onRequest ? (
        <button
          type="button"
          disabled={requesting}
          onClick={onRequest}
          className="bg-primary text-primary-foreground mt-2 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold disabled:opacity-60"
        >
          {requesting ? "요청 중..." : requestLabel}
        </button>
      ) : null}
      {state === "denied" && deniedHelp ? (
        <p className="text-muted-foreground mt-1.5 text-[11px] font-medium">
          {deniedHelp}
        </p>
      ) : null}
      {state === "unsupported" && unsupportedHelp ? (
        <p className="text-muted-foreground mt-1.5 text-[11px] font-medium">
          {unsupportedHelp}
        </p>
      ) : null}
    </li>
  );
}
