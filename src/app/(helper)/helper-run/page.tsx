import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireHelper } from "@/lib/auth/session";
import { todayUtcDateKst } from "@/lib/date/today";

export default async function HelperRunPage() {
  const me = await requireHelper();
  const orgId = me.org.id;

  // 본인이 helperId로 지정된 진행 중 trip이 있으면 곧장 그 화면으로.
  const todayDate = todayUtcDateKst();
  const activeTrip = await db.trip.findFirst({
    where: {
      helperId: me.staff.id,
      vehicle: { orgId },
      date: todayDate,
      endedAt: null,
      startedAt: { not: null },
    },
    select: { id: true },
  });

  if (activeTrip) {
    redirect(`/helper-trip/${activeTrip.id}`);
  }

  // 오늘 helper로 미배정. 기사가 trip 시작 시 동승자로 지정해야 화면이 뜸.
  const candidateTrips = await db.trip.findMany({
    where: {
      vehicle: { orgId, mode: "KIDS" },
      date: todayDate,
      endedAt: null,
      helperId: null,
    },
    include: {
      route: { select: { name: true, direction: true } },
      driver: { select: { name: true } },
      vehicle: { select: { plate: true } },
    },
  });

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4">
      <div>
        <h2 className="text-xl font-semibold">오늘 동승</h2>
        <p className="text-muted-foreground text-sm">
          학원장·원장이 발급한 초대로 가입하면 여기서 동승할 운행이 표시됩니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">아직 동승자로 지정 안 됨</CardTitle>
          <CardDescription>
            기사가 운행을 시작한 뒤 동승자 picker에서 본인을 선택하면 자동으로
            운행 화면으로 이동합니다.
          </CardDescription>
        </CardHeader>
        {candidateTrips.length > 0 ? (
          <CardContent>
            <p className="text-muted-foreground mb-2 text-xs">
              현재 진행 중이고 동승자가 없는 어린이용 운행:
            </p>
            <ul className="space-y-1 text-sm">
              {candidateTrips.map((t) => (
                <li
                  key={t.id}
                  className="bg-background rounded-md border px-3 py-2"
                >
                  <span className="font-medium">{t.route.name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    {t.route.direction === "PICKUP" ? "등원" : "하원"} ·{" "}
                    {t.vehicle.plate} · 기사 {t.driver.name}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        ) : null}
      </Card>

      <p className="text-muted-foreground text-center text-xs">
        <Link href="/login" className="underline">
          로그인 페이지로
        </Link>
      </p>
    </main>
  );
}
