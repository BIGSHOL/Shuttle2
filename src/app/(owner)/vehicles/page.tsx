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

import { DeleteVehicleButton } from "./_components/delete-vehicle-button";

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
            셔틀버스 차량을 등록하고 어린이용·일반용 모드를 관리합니다.
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
                  <div className="bg-card rounded-lg border p-3.5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
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
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/vehicles/${v.id}/edit`}>편집</Link>
                        </Button>
                        <DeleteVehicleButton id={v.id} plate={v.plate} />
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
                    <TableHead>차량번호</TableHead>
                    <TableHead>모드</TableHead>
                    <TableHead>신고증명서</TableHead>
                    <TableHead>보험 만료</TableHead>
                    <TableHead className="pr-[18px] text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.plate}</TableCell>
                      <TableCell>
                        <span
                          className={
                            v.mode === "KIDS"
                              ? "bg-bus text-bus-foreground rounded-md px-2 py-0.5 text-xs font-bold"
                              : "bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-medium"
                          }
                        >
                          {MODE_LABEL[v.mode]}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {v.reportNo ?? "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(v.insuranceUntil)}
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/vehicles/${v.id}/edit`}>편집</Link>
                        </Button>
                        <DeleteVehicleButton id={v.id} plate={v.plate} />
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
