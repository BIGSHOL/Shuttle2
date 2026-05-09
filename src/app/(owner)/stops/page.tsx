import Link from "next/link";
import { ChevronRight, MapPin, MapPinOff, Repeat } from "lucide-react";

import { KpiStrip, KpiStripCell } from "@/components/kpi-card";
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

export default async function StopsPage() {
  const orgId = await getOrgId();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

  const [stops, usedStopCount, recentChangeCount] = await Promise.all([
    db.stop.findMany({
      where: { orgId },
      orderBy: [{ name: "asc" }],
      include: {
        _count: { select: { routes: true } },
      },
    }),
    db.stop.count({
      where: { orgId, routes: { some: {} } },
    }),
    db.stopChangeRequest.count({
      where: { orgId, createdAt: { gte: sevenDaysAgo } },
    }),
  ]);

  const unusedCount = stops.length - usedStopCount;
  const noAddressCount = stops.filter((s) => !s.address).length;

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 lg:p-6">
      {/* 페이지 헤더 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight lg:text-3xl">
            정류장
          </h2>
          <p className="text-muted-foreground mt-1 text-xs font-semibold lg:text-sm">
            카카오맵 좌표로 정류장을 등록합니다. 행을 누르면 지도·사용 노선·home
            학생·변경 요청 history를 확인합니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/stops/new">+ 새 정류장</Link>
        </Button>
      </div>

      {/* KPI strip */}
      <KpiStrip cols={4}>
        <KpiStripCell
          label="총 정류장"
          value={stops.length}
          subtext={
            stops.length > 0 && noAddressCount > 0
              ? `주소 미확인 ${noAddressCount}건`
              : "전체 등록"
          }
          Icon={MapPin}
          tone="info"
        />
        <KpiStripCell
          label="사용 중"
          value={usedStopCount}
          subtext={
            stops.length > 0
              ? `${Math.round((usedStopCount / stops.length) * 100)}% 가동`
              : "-"
          }
          Icon={MapPin}
          tone={usedStopCount > 0 ? "success" : "muted"}
        />
        <KpiStripCell
          label="미사용"
          value={unusedCount}
          subtext={unusedCount > 0 ? "노선 배정 검토" : "전부 사용 중"}
          Icon={MapPinOff}
          tone={unusedCount > 0 ? "warning" : "success"}
        />
        <KpiStripCell
          label="최근 변경 요청"
          value={recentChangeCount}
          subtext="최근 7일"
          Icon={Repeat}
          tone={recentChangeCount > 0 ? "warning" : "muted"}
        />
      </KpiStrip>

      {stops.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>등록된 정류장이 없습니다</CardTitle>
            <CardDescription>
              첫 정류장을 추가해 보세요. 카카오맵에서 위치를 클릭하면 좌표가
              자동으로 채워집니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/stops/new">+ 새 정류장 등록</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 모바일: 카드 stack */}
          <ul className="space-y-2 lg:hidden">
            {stops.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/stops/${s.id}`}
                  className="bg-card hover:bg-muted/40 flex items-start justify-between gap-3 rounded-lg border p-3.5 shadow-sm transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-extrabold tracking-tight">
                      {s.name}
                    </h3>
                    <p className="text-muted-foreground mt-1.5 truncate text-xs font-medium">
                      {s.address ?? "주소 미확인"} · 반경 {s.radiusM}m · 노선{" "}
                      {s._count.routes}건
                    </p>
                  </div>
                  <ChevronRight className="text-muted-foreground mt-1 h-4 w-4 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>

          {/* 데스크톱: 표 */}
          <Card className="hidden py-0 lg:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>주소</TableHead>
                    <TableHead className="w-24">반경</TableHead>
                    <TableHead className="w-24">노선 사용</TableHead>
                    <TableHead className="w-12 pr-[18px] text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stops.map((s) => (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="p-0">
                        <Link
                          href={`/stops/${s.id}`}
                          className="block px-2 py-2.5 font-extrabold tracking-tight"
                        >
                          {s.name}
                        </Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link
                          href={`/stops/${s.id}`}
                          className="text-muted-foreground block px-2 py-2.5 text-sm"
                        >
                          {s.address ?? (
                            <span className="text-muted-foreground/60">
                              주소 미확인
                            </span>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link
                          href={`/stops/${s.id}`}
                          className="text-muted-foreground block px-2 py-2.5 text-sm"
                        >
                          {s.radiusM}m
                        </Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link
                          href={`/stops/${s.id}`}
                          className="block px-2 py-2.5 text-sm font-bold tabular-nums"
                        >
                          {s._count.routes > 0 ? (
                            <span>
                              {s._count.routes}
                              <span className="text-muted-foreground text-xs font-medium">
                                건
                              </span>
                            </span>
                          ) : (
                            <span className="text-warning text-xs">미사용</span>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link
                          href={`/stops/${s.id}`}
                          className="text-muted-foreground flex items-center justify-end py-2.5 pr-[18px]"
                          aria-label="상세"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
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
