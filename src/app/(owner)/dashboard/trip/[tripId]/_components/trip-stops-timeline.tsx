import { formatKstHHmm } from "@/lib/geo/trip-stats";

// W24-B C2: 정류장 진행 timeline — done/next/pending 원형 dot + 수직 연결선.
// 학원장이 운행 진행도를 한눈에 보도록.

export type StopTimelineRow = {
  stopId: string;
  stopOrder: number;
  stopName: string;
  scheduledAt: string | null;
  arrivedAt: Date | null;
  boardCount: number;
  noShowCount: number;
};

export function TripStopsTimeline({ rows }: { rows: StopTimelineRow[] }) {
  if (rows.length === 0) return null;

  const sorted = [...rows].sort((a, b) => a.stopOrder - b.stopOrder);
  const nextIdx = sorted.findIndex((r) => r.arrivedAt === null);
  const doneCount = nextIdx === -1 ? sorted.length : nextIdx;
  const remainCount = sorted.length - doneCount;

  return (
    <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-extrabold tracking-tight">정류장 진행</h3>
        <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
          {doneCount}개 완료 · {remainCount}개 남음. 통과 시각은 GPS STOP_PASS
          기록 기준.
        </p>
      </div>
      <ul>
        {sorted.map((r, i) => {
          const status: "done" | "next" | "pending" =
            i < doneCount ? "done" : i === doneCount ? "next" : "pending";

          const dotClass =
            status === "done"
              ? "bg-success border-success"
              : status === "next"
                ? "bg-bus border-bus shadow-[0_0_0_3px_rgba(245,197,24,0.3)]"
                : "bg-card border-muted-foreground";

          const lineClass =
            status === "done" || (status === "next" && i > 0)
              ? "bg-success"
              : "bg-border";

          const timeLabel = r.arrivedAt ? formatKstHHmm(r.arrivedAt) : null;

          return (
            <li
              key={r.stopId}
              className="relative flex items-center gap-3 border-b px-4 py-3.5 pl-12 last:border-b-0"
            >
              {i !== 0 ? (
                <span
                  className={`absolute top-0 left-[25px] h-1/2 w-0.5 ${lineClass}`}
                />
              ) : null}
              {i !== sorted.length - 1 ? (
                <span
                  className={`absolute bottom-0 left-[25px] h-1/2 w-0.5 ${lineClass}`}
                />
              ) : null}
              <span
                className={`absolute top-1/2 left-[18px] h-4 w-4 -translate-y-1/2 rounded-full border-[3px] ${dotClass}`}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-extrabold tracking-tight">
                  <span className="text-muted-foreground mr-1.5 font-mono text-[10px] font-bold">
                    {r.stopOrder}
                  </span>
                  {r.stopName}
                </div>
                <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                  {status === "done" ? (
                    <>
                      {r.boardCount > 0 ? (
                        <span>처리 {r.boardCount}명</span>
                      ) : null}
                      {r.boardCount > 0 && r.noShowCount > 0 ? (
                        <span>·</span>
                      ) : null}
                      {r.noShowCount > 0 ? (
                        <span className="text-destructive font-bold">
                          미탑승 {r.noShowCount}명
                        </span>
                      ) : null}
                      {r.boardCount === 0 && r.noShowCount === 0 ? (
                        <span>통과</span>
                      ) : null}
                    </>
                  ) : (
                    <span>예정 {r.scheduledAt ?? "—"}</span>
                  )}
                </div>
              </div>
              <div className="text-right leading-tight tabular-nums">
                {status === "done" && timeLabel ? (
                  <>
                    <div className="text-success text-sm font-black">
                      {timeLabel}
                    </div>
                    {r.scheduledAt ? (
                      <div className="text-muted-foreground mt-0.5 text-[10px] font-bold line-through">
                        {r.scheduledAt}
                      </div>
                    ) : null}
                  </>
                ) : status === "next" ? (
                  <span className="bg-bus-soft text-bus-foreground rounded-md px-1.5 py-0.5 text-xs font-black">
                    {r.scheduledAt ?? "—"}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-[11px] font-semibold">
                    {r.scheduledAt ?? "—"}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
