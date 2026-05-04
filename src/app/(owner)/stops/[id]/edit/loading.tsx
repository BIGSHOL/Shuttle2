import { Skeleton } from "@/components/ui/skeleton";

// 정류장 편집 — name + 카카오맵 picker (큰 영역). 일반 form skeleton보다
// 지도 영역 placeholder가 핵심.
export default function StopEditLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="bg-card space-y-4 rounded-lg border p-6">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
        {/* 검색 input */}
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full" />
        </div>
        {/* 카카오맵 picker placeholder */}
        <Skeleton className="h-[420px] w-full rounded-md" />
        <div className="flex justify-end gap-2 pt-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </div>
  );
}
