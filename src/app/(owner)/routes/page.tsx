import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth/session";
import { todayUtcDateKst } from "@/lib/date/today";

import { DeleteRouteButton } from "./_components/delete-route-button";
import { formatDirection, formatWeekdays } from "./_lib/weekdays";

export default async function RoutesPage() {
  const orgId = await getOrgId();
  const todayDate = todayUtcDateKst();

  // Route → Vehicle → orgId 체인으로 본 기관 노선만.
  const [routes, runningTripsCount] = await Promise.all([
    db.route.findMany({
      where: { vehicle: { orgId } },
      orderBy: [{ direction: "asc" }, { name: "asc" }],
      include: {
        vehicle: { select: { plate: true, mode: true } },
        _count: { select: { stops: true, students: true } },
      },
    }),
    db.trip.count({
      where: {
        vehicle: { orgId },
        date: todayDate,
        startedAt: { not: null },
        endedAt: null,
      },
    }),
  ]);

  // refac topbar sub: "전체 4개 노선 · 활성 4 · 운행 중 2"
  const totalRoutes = routes.length;
  // 활성 = 정류장 1개 이상 + 차량 배정. 우리는 모두 vehicle 보유라 stops>0를 기준.
  const activeRoutes = routes.filter((r) => r._count.stops > 0).length;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      {/* W24-D Phase 3 #7 routes topbar: refac owner-routes-list.jpg.
          "노선" h1 + count sub + 우측 액션 group. */}
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-black tracking-tight lg:text-4xl leading-tight">
            노선
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm font-bold">
            전체 {totalRoutes}개 노선 · 활성 {activeRoutes} · 운행 중{" "}
            {runningTripsCount}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            className="bg-bus hover:bg-bus/90 text-bus-foreground font-extrabold"
          >
            <Link href="/routes/new">
              <Plus className="mr-1 h-4 w-4" />새 노선
            </Link>
          </Button>
        </div>
      </section>

      {routes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>등록된 노선이 없습니다</CardTitle>
            <CardDescription>
              차량과 정류장을 먼저 등록한 뒤, 노선을 만들어 정류장을 순서대로
              연결하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/routes/new">+ 새 노선 등록</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 모바일/태블릿: 카드 stack — 가로 스크롤 회피 */}
          <ul className="space-y-2 lg:hidden">
            {routes.map((r) => {
              const dirCls =
                r.direction === "PICKUP"
                  ? "bg-success-soft text-success"
                  : "bg-info-soft text-info";
              return (
                <li key={r.id}>
                  <div className="bg-card rounded-lg border p-3.5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`${dirCls} rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide`}
                          >
                            {formatDirection(r.direction)}
                          </span>
                          <h3 className="text-sm font-extrabold tracking-tight">
                            {r.name}
                          </h3>
                        </div>
                        <p className="text-muted-foreground mt-1.5 text-xs font-medium">
                          [{r.vehicle.mode === "KIDS" ? "어린이용" : "일반용"}]{" "}
                          {r.vehicle.plate} · {formatWeekdays(r.weekdays)} ·
                          정류장 {r._count.stops}개
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/routes/${r.id}/edit`}>편집</Link>
                        </Button>
                        <DeleteRouteButton id={r.id} name={r.name} />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* 데스크톱: 표 */}
          <Card className="hidden py-0 lg:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead className="w-20">방향</TableHead>
                    <TableHead className="w-32">차량</TableHead>
                    <TableHead className="w-28">요일</TableHead>
                    <TableHead className="w-24">정류장</TableHead>
                    <TableHead className="pr-[18px] text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>
                        <span
                          className={
                            r.direction === "PICKUP"
                              ? "bg-success-soft text-success rounded-md px-2 py-0.5 text-xs font-bold"
                              : "bg-info-soft text-info rounded-md px-2 py-0.5 text-xs font-bold"
                          }
                        >
                          {formatDirection(r.direction)}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        [{r.vehicle.mode === "KIDS" ? "어린이용" : "일반용"}]{" "}
                        {r.vehicle.plate}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatWeekdays(r.weekdays)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {r._count.stops}개
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/routes/${r.id}/edit`}>편집</Link>
                        </Button>
                        <DeleteRouteButton id={r.id} name={r.name} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
