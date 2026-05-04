import { Skeleton } from "@/components/ui/skeleton";

// 학부모 home — 인사말 + 알림 토글 + 자녀별 trip 카드 stack + 결석 미리보기.
export default function ParentHomeLoading() {
  return (
    <div className="space-y-4 pb-6">
      <div className="space-y-2 px-4 pt-5">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* 알림 토글 자리 */}
      <div className="px-4">
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>

      {/* trip 카드 2개 */}
      <div className="space-y-3 px-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-card space-y-3 rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-6 w-16 rounded-md" />
            </div>
            <Skeleton className="h-20 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
