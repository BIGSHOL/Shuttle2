"use client";

import { useRouter } from "next/navigation";
import { Radio } from "lucide-react";

import { useOrgTripsUpdates } from "@/lib/geo/use-org-trips-updates";

// 학원장 dashboard의 운행 모니터·KPI 카드를 실시간 자동 갱신.
// 같은 org의 어떤 trip이든 BoardingEvent / SafetyCheck / Trip state 변동이면
// router.refresh로 server component 재실행.
//
// useTripUpdates와 차이: org-trips:<orgId> 채널 구독 (trip 1개가 아니라 N개).
export function OrgDashboardRefresher({ orgId }: { orgId: string }) {
  const router = useRouter();
  const latest = useOrgTripsUpdates(orgId, () => router.refresh());

  if (!latest) return null;

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
        운행 모니터 갱신됨
      </div>
    </div>
  );
}
