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

import { DeleteStopButton } from "./_components/delete-stop-button";

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
            카카오맵 좌표로 정류장을 등록합니다. 노선 만들 때 여기서 등록한
            정류장을 골라 순서를 정합니다.
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
        <Card className="py-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead className="w-44">좌표</TableHead>
                  <TableHead className="w-24">반경</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stops.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {s.radiusM}m
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/stops/${s.id}/edit`}>편집</Link>
                      </Button>
                      <DeleteStopButton id={s.id} name={s.name} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
