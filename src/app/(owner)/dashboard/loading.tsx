import { Skeleton } from "@/components/ui/skeleton";

// dashboard는 KPI 카드 그리드 + 운행 카드 stack 구조. owner/loading의 표 형식
// 대신 카드 grid skeleton.
export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* KPI 카드 7개 grid (vehicle/student/stop/route/absence/stop-change/no-show) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="bg-card space-y-2 rounded-md border p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>

      {/* 오늘 운행 list */}
      <div className="bg-card space-y-3 rounded-md border p-4">
        <Skeleton className="h-5 w-28" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-md border p-3"
          >
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
    </main>
  );
}
