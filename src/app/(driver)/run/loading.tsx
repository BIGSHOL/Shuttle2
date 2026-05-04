import { Skeleton } from "@/components/ui/skeleton";

// 기사 /run — 오늘 운행 목록 + 시작 버튼.
export default function DriverRunLoading() {
  return (
    <div className="space-y-4 px-4 pt-4 pb-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>

      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="bg-card space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-6 w-12 rounded-md" />
          </div>
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}
