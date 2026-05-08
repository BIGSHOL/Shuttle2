"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { ArrowRight, Check, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  createStopChangeRequestAction,
  type CreateStopChangeState,
} from "../actions";

// W24-B C8: 같은 노선의 기존 stop만 선택 가능. 자유 좌표 입력 폐기.

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

function todayKstDateString(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

type Candidate = {
  stopId: string;
  stopName: string;
  stopAddress: string | null;
  order: number;
};

type Item = {
  routeStudentId: string;
  studentId: string;
  studentName: string;
  routeName: string;
  direction: "PICKUP" | "DROPOFF";
  fromStopId: string;
  fromStopName: string;
  candidates: Candidate[];
};

export function StopChangeForm({ items }: { items: Item[] }) {
  const initialState: CreateStopChangeState = {};
  const [state, formAction, pending] = useActionState(
    createStopChangeRequestAction,
    initialState,
  );

  const [selectedKey, setSelectedKey] = useState<string>(
    items[0] ? `${items[0].studentId}__${items[0].fromStopId}` : "",
  );
  const selected = useMemo(
    () =>
      items.find(
        (i) => `${i.studentId}__${i.fromStopId}` === selectedKey,
      ) ?? null,
    [items, selectedKey],
  );

  const [toStopId, setToStopId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [effectiveAt, setEffectiveAt] = useState(todayKstDateString());

  const fieldErr = state.fieldErrors ?? {};

  if (items.length === 0) {
    return (
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>정류장 변경 신청</CardTitle>
          <CardDescription>
            학원에서 등록한 자녀와 정류장 정보가 없습니다. 학원장께 문의해 주세요.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="outline">
            <Link href="/my-stop-changes">돌아가기</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-extrabold tracking-tight">
            정류장 변경 신청
          </CardTitle>
          <CardDescription>
            같은 노선의 다른 정류장으로 변경할 수 있어요. 학원장 승인 후 기사·동승자에게
            자동 안내됩니다.
            <br />
            <span className="text-muted-foreground/80 text-[11px]">
              새 정류장이 필요하면 학원에 직접 요청해 주세요.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 자녀·기존 정류장 선택 */}
          <div className="space-y-1.5">
            <Label className="text-xs font-extrabold">자녀 · 기존 정류장</Label>
            <Select
              value={selectedKey}
              onValueChange={(v) => {
                setSelectedKey(v);
                setToStopId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="자녀와 정류장을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {items.map((i) => {
                  const k = `${i.studentId}__${i.fromStopId}`;
                  return (
                    <SelectItem key={k} value={k}>
                      {i.studentName} · {i.routeName} (
                      {DIRECTION_LABEL[i.direction]}) · {i.fromStopName}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <input
              type="hidden"
              name="studentId"
              value={selected?.studentId ?? ""}
            />
            <input
              type="hidden"
              name="fromStopId"
              value={selected?.fromStopId ?? ""}
            />
          </div>

          {/* 새 정류장 picker */}
          {selected ? (
            <div className="space-y-2">
              <Label className="text-xs font-extrabold">새 정류장 선택</Label>
              <p className="text-muted-foreground text-[11px] font-semibold">
                노선{" "}
                <span className="text-foreground font-bold">
                  {selected.routeName}
                </span>
                의 정류장 중에서만 선택 가능
              </p>
              {selected.candidates.length === 0 ? (
                <p className="bg-muted text-muted-foreground rounded-md p-3 text-xs font-medium">
                  이 노선에는 다른 정류장이 없습니다. 학원에 새 정류장 추가를
                  요청해 주세요.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {selected.candidates.map((c) => {
                    const checked = c.stopId === toStopId;
                    return (
                      <li key={c.stopId}>
                        <button
                          type="button"
                          onClick={() => setToStopId(c.stopId)}
                          className={`w-full rounded-md border p-3 text-left transition-colors ${
                            checked
                              ? "border-bus bg-bus-soft"
                              : "border-input bg-background hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                                checked
                                  ? "bg-bus text-bus-foreground"
                                  : "border-input border"
                              }`}
                            >
                              {checked ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : (
                                <MapPin className="text-muted-foreground/60 h-3 w-3" />
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 font-mono text-[10px] font-extrabold">
                                  {c.order}
                                </span>
                                <span className="text-sm font-extrabold tracking-tight">
                                  {c.stopName}
                                </span>
                              </div>
                              {c.stopAddress ? (
                                <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
                                  {c.stopAddress}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <input type="hidden" name="toStopId" value={toStopId} />
              {fieldErr.toStopId ? (
                <p className="text-destructive text-xs font-medium">
                  {fieldErr.toStopId[0]}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* 변경 흐름 시각화 */}
          {selected && toStopId ? (
            <div className="bg-muted/30 flex items-center gap-2 rounded-md border border-dashed p-3 text-xs font-medium">
              <span className="bg-card text-muted-foreground rounded-md border px-2 py-0.5 font-bold line-through">
                {selected.fromStopName}
              </span>
              <ArrowRight className="text-muted-foreground h-3.5 w-3.5" />
              <span className="bg-bus-soft text-bus-foreground rounded-md px-2 py-0.5 font-extrabold">
                {selected.candidates.find((c) => c.stopId === toStopId)
                  ?.stopName ?? "—"}
              </span>
            </div>
          ) : null}

          {/* 적용일자 */}
          <div className="space-y-1.5">
            <Label htmlFor="effectiveAt" className="text-xs font-extrabold">
              적용 시작일
            </Label>
            <Input
              id="effectiveAt"
              name="effectiveAt"
              type="date"
              value={effectiveAt}
              onChange={(e) => setEffectiveAt(e.target.value)}
              required
            />
          </div>

          {/* 사유 */}
          <div className="space-y-1.5">
            <Label htmlFor="reason" className="text-xs font-extrabold">
              사유 (선택)
            </Label>
            <Input
              id="reason"
              name="reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 이사로 인한 변경"
              maxLength={500}
            />
          </div>

          {state.error ? (
            <p
              className="text-destructive text-xs font-medium"
              role="alert"
            >
              {state.error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="gap-2">
          <Button asChild variant="outline" className="flex-1">
            <Link href="/my-stop-changes">취소</Link>
          </Button>
          <Button
            type="submit"
            className="bg-bus hover:bg-bus/90 text-bus-foreground flex-1 font-extrabold"
            disabled={pending || !toStopId}
          >
            {pending ? "신청 중..." : "변경 신청"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
