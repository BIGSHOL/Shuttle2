import { Skeleton } from "@/components/ui/skeleton";

// 폼 페이지(편집·신규·초대) 공용 skeleton.
// 카드 안에 라벨+입력 row가 N개. 마지막 제출 버튼.
//
// page.tsx가 <main>을 가지므로 fallback은 <div> — landmark 중복 방지.
//
// fields: 표시할 입력 필드 개수 (기본 4).
// outerClassName: 페이지 outer container와 동일하게 맞추면 fallback ↔ page
//                 전환 시 시각 점프 없음.
export function FormSkeleton({
  fields = 4,
  outerClassName = "mx-auto max-w-2xl space-y-6 p-6",
  showHeader = true,
}: {
  fields?: number;
  outerClassName?: string;
  showHeader?: boolean;
}) {
  return (
    <div className={outerClassName}>
      {showHeader ? (
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
      ) : null}
      <div className="bg-card space-y-4 rounded-2xl border p-6">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </div>
  );
}
