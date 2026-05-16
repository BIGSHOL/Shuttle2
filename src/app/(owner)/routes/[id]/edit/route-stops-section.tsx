"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
  updateRouteStopAction,
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
            <Link href="/stops" className="font-medium underline">
              정류장을 등록
            </Link>
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
                <SearchableSelect
                  id="stopId"
                  name="stopId"
                  required
                  defaultValue={stops[0]?.id}
                  placeholder="정류장 선택"
                  searchPlaceholder="정류장 이름으로 검색"
                  options={stops.map((s) => ({ value: s.id, label: s.name }))}
                />
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
  const [editing, setEditing] = useState(false);
  const [orderValue, setOrderValue] = useState(String(row.order));
  const [scheduledValue, setScheduledValue] = useState(row.scheduledAt);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function cancelEdit() {
    setEditing(false);
    setOrderValue(String(row.order));
    setScheduledValue(row.scheduledAt);
    setError(null);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateRouteStopAction(routeId, row.id, {
          order: Number(orderValue),
          scheduledAt: scheduledValue,
        });
        if (result && "error" in result) {
          setError(result.error);
        } else {
          setEditing(false);
        }
      } catch (err) {
        console.error("[route-stop-row] update failed", err);
        setError("수정에 실패했어요. 잠시 후 다시 시도해 주세요.");
      }
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteRouteStopAction(routeId, row.id);
      } catch (err) {
        console.error("[route-stop-row] delete failed", err);
        setError("삭제에 실패했어요. 잠시 후 다시 시도해 주세요.");
      }
    });
  }

  return (
    <TableRow>
      <TableCell className="font-mono text-sm">
        {editing ? (
          <Input
            type="number"
            min={1}
            max={99}
            value={orderValue}
            onChange={(e) => setOrderValue(e.target.value)}
            className="h-8 w-16"
          />
        ) : (
          row.order
        )}
      </TableCell>
      <TableCell>{row.stop.name}</TableCell>
      <TableCell className="font-mono text-sm">
        {editing ? (
          <Input
            type="time"
            value={scheduledValue}
            onChange={(e) => setScheduledValue(e.target.value)}
            className="h-8 w-28"
          />
        ) : (
          row.scheduledAt
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-1">
            {editing ? (
              <>
                <Button size="sm" disabled={pending} onClick={save}>
                  {pending ? "..." : "저장"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={cancelEdit}
                >
                  취소
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(true)}
                >
                  편집
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={remove}
                >
                  {pending ? "..." : "삭제"}
                </Button>
              </>
            )}
          </div>
          {error ? (
            <span className="text-destructive text-xs">{error}</span>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}
