"use client";

import { useActionState, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  addRouteStudentAction,
  deleteRouteStudentAction,
  type RouteStudentFormState,
} from "../../actions";

type RouteOption = {
  id: string;
  name: string;
  direction: "PICKUP" | "DROPOFF";
};
type StopOption = { id: string; name: string };
type RouteStudentRow = {
  id: string;
  route: { id: string; name: string; direction: "PICKUP" | "DROPOFF" };
  stop: { id: string; name: string };
};

export function RouteStudentsSection({
  studentId,
  rows,
  routes,
  stops,
}: {
  studentId: string;
  rows: RouteStudentRow[];
  routes: RouteOption[];
  stops: StopOption[];
}) {
  const boundAdd = addRouteStudentAction.bind(null, studentId);
  const [state, formAction, pending] = useActionState<
    RouteStudentFormState,
    FormData
  >(boundAdd, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>노선·정류장 배정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {routes.length === 0 ? (
          <p className="text-destructive text-sm">
            먼저{" "}
            <a href="/routes" className="font-medium underline">
              노선을 등록
            </a>
            해야 배정할 수 있습니다.
          </p>
        ) : null}
        {stops.length === 0 ? (
          <p className="text-destructive text-sm">
            먼저{" "}
            <a href="/stops" className="font-medium underline">
              정류장을 등록
            </a>
            해야 배정할 수 있습니다.
          </p>
        ) : null}

        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            아직 배정된 노선이 없습니다. 아래에서 추가하세요.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>노선</TableHead>
                <TableHead className="w-20">방향</TableHead>
                <TableHead>정류장</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((rs) => (
                <RouteStudentRowView
                  key={rs.id}
                  studentId={studentId}
                  row={rs}
                />
              ))}
            </TableBody>
          </Table>
        )}

        {routes.length > 0 && stops.length > 0 ? (
          <form action={formAction} className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium">새 배정 추가</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-1">
                <Label htmlFor="routeId" className="text-xs">
                  노선
                </Label>
                <select
                  id="routeId"
                  name="routeId"
                  required
                  defaultValue={routes[0]?.id}
                  className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.direction === "PICKUP" ? "등원" : "하원"}] {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="stopId" className="text-xs">
                  정류장
                </Label>
                <select
                  id="stopId"
                  name="stopId"
                  required
                  defaultValue={stops[0]?.id}
                  className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs"
                >
                  {stops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={pending} className="w-full">
                  {pending ? "추가 중..." : "추가"}
                </Button>
              </div>
            </div>
            {state.error ? (
              <p className="text-destructive text-sm" role="alert">
                {state.error}
              </p>
            ) : null}
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RouteStudentRowView({
  studentId,
  row,
}: {
  studentId: string;
  row: RouteStudentRow;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <TableRow>
      <TableCell className="font-medium">{row.route.name}</TableCell>
      <TableCell>
        <span
          className={
            row.route.direction === "PICKUP"
              ? "rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900"
              : "rounded-md bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900"
          }
        >
          {row.route.direction === "PICKUP" ? "등원" : "하원"}
        </span>
      </TableCell>
      <TableCell>{row.stop.name}</TableCell>
      <TableCell className="text-right">
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                await deleteRouteStudentAction(studentId, row.id);
              } catch (err) {
                setError(err instanceof Error ? err.message : "삭제 실패");
              }
            });
          }}
        >
          {pending ? "..." : "해제"}
        </Button>
        {error ? (
          <span className="text-destructive ml-2 text-xs">{error}</span>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
