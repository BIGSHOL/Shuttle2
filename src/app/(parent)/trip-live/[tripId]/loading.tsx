import { Skeleton } from "@/components/ui/skeleton";

// trip-live는 fixed inset-0 z-50 풀스크린 — 상위 layout header를 가린다.
// 지도 영역 + 상태 헤더 + 정류장 진행도 stack을 흉내내는 풀스크린 skeleton.
export default function TripLiveLoading() {
  return (
    <div className="bg-background fixed inset-0 z-50 flex flex-col">
      {/* 상단 상태 헤더 */}
      <div className="bg-card space-y-2 border-b p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
        <Skeleton className="h-4 w-28" />
      </div>

      {/* 지도 자리 */}
      <Skeleton className="flex-1 rounded-none" />

      {/* 하단 정류장 진행도 */}
      <div className="bg-card space-y-2 border-t p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
