import { Skeleton } from "@/components/ui/skeleton";

// 동승자 그룹은 운행 화면을 driver와 공유하지만 layout이 다름. 단순 skeleton.
export default function HelperLoading() {
  return (
    <div className="space-y-4 px-4 pt-4 pb-6">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="bg-card space-y-3 rounded-2xl border p-4">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
