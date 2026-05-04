import { Skeleton } from "@/components/ui/skeleton";

// 학부모 공용 loading. 모바일 max-w-md 그룹 layout 안에 자리잡음.
// 알림·결석·정류장 변경 list 페이지에 어울리는 카드 stack.
export default function ParentLoading() {
  return (
    <div className="space-y-3 px-4 pt-4 pb-6">
      <Skeleton className="h-6 w-32" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card space-y-2 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
