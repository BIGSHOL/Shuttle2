"use client";

import { useRouter } from "next/navigation";
import { Radio } from "lucide-react";

import { useTripUpdates } from "@/lib/geo/use-trip-updates";

const REASON_LABEL: Record<string, string> = {
  boarding: "탑승·하차 변동",
  issue: "미탑승·미하차 변동",
  safety: "안전점검 변동",
  "trip-state": "운행 상태 변동",
};

// trip:<tripId> 채널의 "update" 이벤트를 구독해 router.refresh 트리거.
// 학원장 / 기사 / 동승자 trip 화면 모두 공용 — 자기 자신이 publish해도 refresh되는데
// 같은 server data가 다시 로드돼 사실상 no-op이라 비용 무시 가능.
// 페이지 자체는 Server Component이므로 이 컴포넌트가 effect 전용으로 마운트.
// 토스트는 update 받을 때마다 key로 remount되며 tw-animate-css 로 자동 페이드.
export function TripRealtimeRefresher({ tripId }: { tripId: string }) {
  const router = useRouter();
  const latest = useTripUpdates(tripId, () => router.refresh());

  if (!latest) return null;
  const label = REASON_LABEL[latest.reason] ?? "갱신됨";

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4"
    >
      <div
        key={latest.at}
        className="bg-foreground text-background animate-in fade-in-0 slide-in-from-bottom-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold shadow-lg duration-300"
      >
        <Radio className="h-3.5 w-3.5 animate-pulse" />
        실시간 갱신 — {label}
      </div>
    </div>
  );
}
