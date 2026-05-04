import { Skeleton } from "@/components/ui/skeleton";

// 학부모 정류장 변경 요청 — 자녀·기존 정류장 Select + 카카오맵 picker + 사유.
// 지도 placeholder 핵심.
export default function StopChangeNewLoading() {
  return (
    <div className="space-y-4 px-4 pt-4 pb-6">
      <div className="bg-card space-y-4 rounded-2xl border p-5">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-full" />
        </div>
        {/* 지도 picker */}
        <Skeleton className="h-[320px] w-full rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
