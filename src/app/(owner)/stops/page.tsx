import Link from "next/link";
import {
  ChevronRight,
  MapPin,
  MapPinOff,
  Power,
  Repeat,
  Search,
} from "lucide-react";

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
import { cn } from "@/lib/utils";

import { StopsToolbar } from "./_components/stops-toolbar";
import { ToggleStopActiveButton } from "./_components/toggle-stop-active-button";
import {
  listStops,
  parseStopsSearchParams,
  type RawSearchParams,
} from "./_lib/query";

export default async function StopsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const orgId = await getOrgId();
  const params = parseStopsSearchParams(await searchParams);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

  // KPI는 필터 무관하게 전체 기준. 행 리스트만 필터 적용.
  const [filteredStops, totalCount, usedCount, inactiveCount, noAddressCount, recentChangeCount] =
    await Promise.all([
      listStops(orgId, params),
      db.stop.count({ where: { orgId } }),
      db.stop.count({ where: { orgId, routes: { some: {} } } }),
      db.stop.count({ where: { orgId, isActive: false } }),
      db.stop.count({ where: { orgId, address: null } }),
      db.stopChangeRequest.count({
        where: { orgId, createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

  const activeCount = totalCount - inactiveCount;
  const unusedCount = totalCount - usedCount;
  const filteredHasNone = filteredStops.length === 0 && totalCount > 0;

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 lg:p-6">
      {/* 페이지 헤더 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight lg:text-3xl">
            정류장
          </h2>
          <p className="text-muted-foreground mt-1 text-xs font-semibold lg:text-sm">
            카카오맵 좌표로 정류장을 등록합니다. 행을 누르면 지도·사용 노선·배정 학생·변경 요청 이력을 확인합니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/stops/new">+ 새 정류장</Link>
        </Button>
      </div>

      {/* KPI strip — 5칸 (총·사용중 노선·사용중 정류장·미사용·최근 변경) */}
      <KpiStrip cols={5}>
        <KpiStripCell
          label="총 정류장"
          value={totalCount}
          subtext={
            totalCount > 0 && noAddressCount > 0
              ? `주소 미확인 ${noAddressCount}건`
              : "전체 등록"
          }
          Icon={MapPin}
          tone="info"
        />
        <KpiStripCell
          label="사용 중"
          value={activeCount}
          subtext={
            inactiveCount > 0 ? `미사용 ${inactiveCount}개` : "전부 사용 중"
          }
          Icon={Power}
          tone={inactiveCount > 0 ? "warning" : "success"}
        />
        <KpiStripCell
          label="노선 배정됨"
          value={usedCount}
          subtext={
            totalCount > 0
              ? `${Math.round((usedCount / totalCount) * 100)}% 가동`
              : "-"
          }
          Icon={MapPin}
          tone={usedCount > 0 ? "success" : "muted"}
        />
        <KpiStripCell
          label="노선 미배정"
          value={unusedCount}
          subtext={unusedCount > 0 ? "배정 검토" : "전부 사용 중"}
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

      {/* 검색·필터 toolbar */}
      {totalCount > 0 ? <StopsToolbar current={params} /> : null}

      {totalCount === 0 ? (
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
      ) : filteredHasNone ? (
        <Card>
          <CardHeader>
            <CardTitle>검색 결과가 없습니다</CardTitle>
            <CardDescription>
              검색어·필터를 조정하거나 초기화 버튼을 눌러 주세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/stops">필터 초기화</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            <Search className="mr-1 inline h-3 w-3" />
            {filteredStops.length}개 표시 · 전체 {totalCount}개
          </p>

          {/* 모바일: 카드 stack */}
          <ul className="space-y-2 lg:hidden">
            {filteredStops.map((s) => (
              <li key={s.id}>
                <div
                  className={cn(
                    "bg-card flex items-stretch gap-0 rounded-lg border shadow-sm",
                    !s.isActive && "opacity-60",
                  )}
                >
                  <Link
                    href={`/stops/${s.id}`}
                    className="hover:bg-muted/40 min-w-0 flex-1 p-3.5 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-sm font-extrabold tracking-tight">
                        {s.name}
                      </h3>
                      {!s.isActive ? (
                        <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-wide">
                          미사용
                        </span>
                      ) : null}
                      {s._count.routes === 0 ? (
                        <span className="bg-warning-soft text-warning rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-wide">
                          노선 미배정
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground mt-1.5 truncate text-xs font-medium">
                      {s.address ?? "주소 미확인"} · 반경 {s.radiusM}m · 노선{" "}
                      {s._count.routes}건
                    </p>
                  </Link>
                  <div className="flex shrink-0 flex-col items-end gap-1 p-3.5">
                    <ToggleStopActiveButton id={s.id} isActive={s.isActive} />
                    <ChevronRight className="text-muted-foreground h-4 w-4" />
                  </div>
                </div>
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
                    <TableHead className="w-32 pr-[18px] text-right">
                      관리
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStops.map((s) => (
                    <TableRow
                      key={s.id}
                      className={cn(
                        "hover:bg-muted/50",
                        !s.isActive && "opacity-60",
                      )}
                    >
                      <TableCell className="p-0">
                        <Link
                          href={`/stops/${s.id}`}
                          className="block px-2 py-2.5 font-extrabold tracking-tight"
                        >
                          {s.name}
                          {!s.isActive ? (
                            <span className="bg-muted text-muted-foreground ml-2 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                              미사용
                            </span>
                          ) : null}
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
                            <span className="text-warning text-xs">
                              미배정
                            </span>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell className="space-x-1 pr-[18px] text-right">
                        <ToggleStopActiveButton
                          id={s.id}
                          isActive={s.isActive}
                          showLabel={false}
                        />
                        <Link
                          href={`/stops/${s.id}`}
                          className="text-muted-foreground inline-flex items-center"
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
