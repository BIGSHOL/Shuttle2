import { Skeleton } from "@/components/ui/skeleton";

// (auth) — login·signup·forgot-password·reset-password 카드 form skeleton.
// page.tsx가 <main>을 가지므로 fallback은 <div>로 — landmark 중복 방지.
// page.tsx의 outer container와 동일한 시각 위치 유지.
export default function AuthLoading() {
  return (
    <div className="bg-muted/40 flex min-h-screen items-center justify-center p-4">
      <div className="bg-card w-full max-w-md space-y-4 rounded-lg border p-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
