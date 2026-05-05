import { Skeleton } from "@/components/ui/skeleton";

export default function DriverAnalyticsDetailLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-44 rounded-md" />
      </div>
      <Skeleton className="h-28 w-full rounded-lg" />
      <div className="bg-card space-y-3 rounded-lg border p-5">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-3 w-72" />
        <div className="space-y-2 pt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}
