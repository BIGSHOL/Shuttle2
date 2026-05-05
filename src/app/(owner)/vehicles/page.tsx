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

const MODE_LABEL = {
  KIDS: "어린이용",
  GENERAL: "일반용",
} as const;

function formatDate(d: Date | null) {
  if (!d) return "-";
  return d.toISOString().slice(0, 10);
}

export default async function VehiclesPage() {
  const orgId = await getOrgId();

  const vehicles = await db.vehicle.findMany({
    where: { orgId },
    orderBy: [{ mode: "asc" }, { plate: "asc" }],
  });

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">차량</h2>
          <p className="text-muted-foreground text-sm">
            셔틀버스 차량을 등록하고 어린이용·일반용 모드를 관리합니다. 카드를
            누르면 30일 운행 통계·배정 노선·안전점검 이슈를 확인합니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/vehicles/new">+ 새 차량</Link>
        </Button>
      </div>

      {vehicles.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>등록된 차량이 없습니다</CardTitle>
            <CardDescription>
              첫 차량을 등록해 셔틀이 운영을 시작하세요. 어린이용 모드 차량은
              어린이통학버스 신고증명서와 보험 정보가 필요합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/vehicles/new">+ 새 차량 등록</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 모바일/태블릿: 카드 stack — 가로 스크롤 회피 */}
          <ul className="space-y-2 lg:hidden">
            {vehicles.map((v) => {
              const modeCls =
                v.mode === "KIDS"
                  ? "bg-bus text-bus-foreground"
                  : "bg-muted text-muted-foreground";
              return (
                <li key={v.id}>
                  <Link
                    href={`/vehicles/${v.id}`}
                    className="bg-card hover:bg-muted/40 flex items-start justify-between gap-3 rounded-lg border p-3.5 shadow-sm transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`${modeCls} rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide`}
                        >
                          {MODE_LABEL[v.mode]}
                        </span>
                        <h3 className="text-sm font-extrabold tracking-tight">
                          {v.plate}
                        </h3>
                      </div>
                      <p className="text-muted-foreground mt-1.5 text-xs font-medium">
                        신고증 {v.reportNo ?? "-"} · 보험 만료{" "}
                        {formatDate(v.insuranceUntil)}
                      </p>
                    </div>
                    <ChevronRight className="text-muted-foreground mt-1 h-4 w-4 shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* 데스크톱: 표 — 행 전체 Link */}
          <Card className="hidden py-0 lg:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>차량번호</TableHead>
                    <TableHead>모드</TableHead>
                    <TableHead>신고증명서</TableHead>
                    <TableHead>보험 만료</TableHead>
                    <TableHead className="w-12 pr-[18px] text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((v) => (
                    <TableRow
                      key={v.id}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="p-0">
                        <Link
                          href={`/vehicles/${v.id}`}
                          className="block px-2 py-2 font-medium"
                        >
                          {v.plate}
                        </Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link
                          href={`/vehicles/${v.id}`}
                          className="block px-2 py-2"
                        >
                          <span
                            className={
                              v.mode === "KIDS"
                                ? "bg-bus text-bus-foreground rounded-md px-2 py-0.5 text-xs font-bold"
                                : "bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-medium"
                            }
                          >
                            {MODE_LABEL[v.mode]}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link
                          href={`/vehicles/${v.id}`}
                          className="text-muted-foreground block px-2 py-2 text-sm"
                        >
                          {v.reportNo ?? "-"}
                        </Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link
                          href={`/vehicles/${v.id}`}
                          className="text-muted-foreground block px-2 py-2 text-sm"
                        >
                          {formatDate(v.insuranceUntil)}
                        </Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link
                          href={`/vehicles/${v.id}`}
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
