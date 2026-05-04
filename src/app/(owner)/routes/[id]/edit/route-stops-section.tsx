"use client";

import { useActionState, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  addRouteStopAction,
  deleteRouteStopAction,
  type RouteStopFormState,
} from "../../actions";

type StopOption = { id: string; name: string };
type RouteStopRow = {
  id: string;
  order: number;
  scheduledAt: string;
  stop: { id: string; name: string };
};

export function RouteStopsSection({
  routeId,
  routeStops,
  stops,
}: {
  routeId: string;
  routeStops: RouteStopRow[];
  stops: StopOption[];
}) {
  const boundAdd = addRouteStopAction.bind(null, routeId);
  const [state, formAction, pending] = useActionState<
    RouteStopFormState,
    FormData
  >(boundAdd, {});

  const nextOrder = (routeStops[routeStops.length - 1]?.order ?? 0) + 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>정류장 순서</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stops.length === 0 ? (
          <p className="text-destructive text-sm">
            먼저{" "}
            <a href="/stops" className="font-medium underline">
              정류장을 등록
            </a>
            해야 노선에 추가할 수 있습니다.
          </p>
        ) : null}

        {routeStops.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            아직 정류장이 없습니다. 아래에서 추가하세요.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">순서</TableHead>
                <TableHead>정류장</TableHead>
                <TableHead className="w-24">시각</TableHead>
                <TableHead className="pr-[18px] text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routeStops.map((rs) => (
                <RouteStopRowView key={rs.id} routeId={routeId} row={rs} />
              ))}
            </TableBody>
          </Table>
        )}

        {stops.length > 0 ? (
          <form action={formAction} className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium">새 정류장 추가</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_120px_120px_auto]">
              <div className="space-y-1">
                <Label htmlFor="stopId" className="text-xs">
                  정류장
                </Label>
                <Select name="stopId" required defaultValue={stops[0]?.id}>
                  <SelectTrigger id="stopId">
                    <SelectValue placeholder="정류장 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {stops.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {state.fieldErrors?.stopId ? (
                  <p className="text-destructive text-xs">
                    {state.fieldErrors.stopId[0]}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1">
                <Label htmlFor="order" className="text-xs">
                  순서
                </Label>
                <Input
                  id="order"
                  name="order"
                  type="number"
                  min={1}
                  max={99}
                  defaultValue={nextOrder}
                  required
                />
                {state.fieldErrors?.order ? (
                  <p className="text-destructive text-xs">
                    {state.fieldErrors.order[0]}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1">
                <Label htmlFor="scheduledAt" className="text-xs">
                  예정 시각
                </Label>
                <Input
                  id="scheduledAt"
                  name="scheduledAt"
                  type="time"
                  required
                  defaultValue="08:00"
                />
                {state.fieldErrors?.scheduledAt ? (
                  <p className="text-destructive text-xs">
                    {state.fieldErrors.scheduledAt[0]}
                  </p>
                ) : null}
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

function RouteStopRowView({
  routeId,
  row,
}: {
  routeId: string;
  row: RouteStopRow;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <TableRow>
      <TableCell className="font-mono text-sm">{row.order}</TableCell>
      <TableCell>{row.stop.name}</TableCell>
      <TableCell className="font-mono text-sm">{row.scheduledAt}</TableCell>
      <TableCell className="text-right">
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                await deleteRouteStopAction(routeId, row.id);
              } catch (err) {
                setError(err instanceof Error ? err.message : "삭제 실패");
              }
            });
          }}
        >
          {pending ? "..." : "삭제"}
        </Button>
        {error ? (
          <span className="text-destructive ml-2 text-xs">{error}</span>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
