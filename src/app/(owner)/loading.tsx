import { Skeleton } from "@/components/ui/skeleton";

// 학원장 그룹 공용 loading. 페이지별 loading.tsx가 있으면 그게 우선.
// 표 형식 페이지(차량·학생·노선·정류장·직원·보호자·결석·정류장 변경·교육·안전운행기록)
// 대부분에 어울리는 generic skeleton.
export default function OwnerLoading() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      <div className="bg-card overflow-hidden rounded-md border">
        <div className="border-b p-4">
          <div className="flex gap-4">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b p-4 last:border-b-0">
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
