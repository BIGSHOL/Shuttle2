import Link from "next/link";

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

import { DeleteRouteButton } from "./_components/delete-route-button";
import { formatDirection, formatWeekdays } from "./_lib/weekdays";

export default async function RoutesPage() {
  const orgId = await getOrgId();

  // Route → Vehicle → orgId 체인으로 본 기관 노선만.
  const routes = await db.route.findMany({
    where: { vehicle: { orgId } },
    orderBy: [{ direction: "asc" }, { name: "asc" }],
    include: {
      vehicle: { select: { plate: true, mode: true } },
      _count: { select: { stops: true, students: true } },
    },
  });

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">노선</h2>
          <p className="text-muted-foreground text-sm">
            등원·하원 노선을 차량에 묶고, 정류장 순서·시각을 관리합니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/routes/new">+ 새 노선</Link>
        </Button>
      </div>

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
                    <TableHead className="text-right">관리</TableHead>
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
