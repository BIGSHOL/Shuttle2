import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { db } from "@/lib/db";

// 어린이용 차량 보험 만료 D-30 / 미입력 알림.
// orgId 필터 + 어린이용 모드 + 만료 30일 이내 OR null. Suspense로 분리.
export async function ExpiringVehicleAlert({ orgId }: { orgId: string }) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const d30 = new Date(today);
  d30.setUTCDate(d30.getUTCDate() + 30);

  const expiringVehicles = await db.vehicle.findMany({
    where: {
      orgId,
      mode: "KIDS",
      OR: [{ insuranceUntil: null }, { insuranceUntil: { lte: d30 } }],
    },
    orderBy: [{ insuranceUntil: "asc" }],
    select: { id: true, plate: true, insuranceUntil: true },
  });

  if (expiringVehicles.length === 0) return null;

  return (
    <section>
      <div className="border-warning bg-warning-soft/40 rounded-lg border p-4 shadow-sm">
        <div className="flex items-start gap-2">
          <span className="bg-warning text-warning-foreground mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
            <ShieldAlert className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-extrabold tracking-tight">
              보험 만료 임박·미입력 차량 ({expiringVehicles.length})
            </h3>
            <p className="text-muted-foreground mt-0.5 text-xs font-medium">
              어린이통학버스(어린이용 모드) 보험은 법정 의무.
            </p>
          </div>
        </div>
        <ul className="mt-3 space-y-1.5">
          {expiringVehicles.map((v) => {
            const expired = v.insuranceUntil && v.insuranceUntil < today;
            const dateLabel = v.insuranceUntil
              ? v.insuranceUntil.toISOString().slice(0, 10)
              : "미입력";
            const tone = expired
              ? "bg-destructive/10 text-destructive"
              : v.insuranceUntil
                ? "bg-warning text-warning-foreground"
                : "bg-muted text-muted-foreground";
            return (
              <li key={v.id}>
                <Link
                  href={`/vehicles/${v.id}/edit`}
                  className="bg-background hover:bg-muted/40 flex items-center justify-between gap-3 rounded-md border px-3 py-2 transition-colors"
                >
                  <span className="flex items-center gap-2 font-mono text-sm font-bold">
                    {v.plate}
                    <span className="text-muted-foreground text-[11px] font-medium">
                      만료 {dateLabel}
                    </span>
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${tone}`}
                  >
                    {expired
                      ? "만료됨"
                      : v.insuranceUntil
                        ? "30일 이내"
                        : "미입력"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
