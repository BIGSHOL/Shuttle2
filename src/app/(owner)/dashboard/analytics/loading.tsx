import { Skeleton } from "@/components/ui/skeleton";

// /dashboard/analytics 로딩 스켈레톤. trip aggregate 쿼리가 LocationPing 많은
// 학원에서는 1~2초 걸릴 수 있어 loading.tsx로 부드럽게.
export default function AnalyticsLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-44 rounded-md" />
      </div>

      {/* 노선별 표 + 기사별 표 — 각 6행 정도 skeleton */}
      {Array.from({ length: 2 }).map((_, sectionIdx) => (
        <div
          key={sectionIdx}
          className="bg-card space-y-3 rounded-lg border p-5"
        >
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3 w-64" />
          <div className="space-y-2 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-md border p-3"
              >
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="ml-auto h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
