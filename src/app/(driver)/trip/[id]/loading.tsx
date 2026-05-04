import { Skeleton } from "@/components/ui/skeleton";

// 기사 trip 운행 화면 — dark gradient 헤더 + 정류장 progress + 종료 버튼.
export default function DriverTripLoading() {
  return (
    <main className="space-y-4 px-4 pt-4 pb-6">
      {/* dark gradient 헤더 자리 */}
      <Skeleton className="h-32 w-full rounded-2xl" />

      {/* 안전점검 카드 (KIDS 모드일 수 있음) */}
      <Skeleton className="h-24 w-full rounded-2xl" />

      {/* 정류장 진행도 + 학생 토글 */}
      <div className="bg-card space-y-3 rounded-2xl border p-4">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>

      {/* 종료 버튼 자리 */}
      <Skeleton className="h-14 w-full rounded-2xl" />
    </main>
  );
}
