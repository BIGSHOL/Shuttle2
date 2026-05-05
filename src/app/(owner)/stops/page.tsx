import Link from "next/link";
import { ChevronRight } from "lucide-react";

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

  const stops = await db.stop.findMany({
    where: { orgId },
    orderBy: [{ name: "asc" }],
  });

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">정류장</h2>
          <p className="text-muted-foreground text-sm">
            카카오맵 좌표로 정류장을 등록합니다. 카드를 누르면 위치 지도·사용
            노선·home 학생·변경 요청 history를 확인합니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/stops/new">+ 새 정류장</Link>
        </Button>
      </div>

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
          {/* 모바일/태블릿: 카드 stack — 가로 스크롤 회피 */}
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
                      {s.address ?? "주소 미확인"} · 반경 {s.radiusM}m
                    </p>
                  </div>
                  <ChevronRight className="text-muted-foreground mt-1 h-4 w-4 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>

          {/* 데스크톱: 표 — 행 전체 Link */}
          <Card className="hidden py-0 lg:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>주소</TableHead>
                    <TableHead className="w-24">반경</TableHead>
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
                          className="block px-2 py-2 font-medium"
                        >
                          {s.name}
                        </Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link
                          href={`/stops/${s.id}`}
                          className="text-muted-foreground block px-2 py-2 text-sm"
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
                          className="text-muted-foreground block px-2 py-2 text-sm"
                        >
                          {s.radiusM}m
                        </Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link
                          href={`/stops/${s.id}`}
                          className="text-muted-foreground flex items-center justify-end pr-[18px] py-2"
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
