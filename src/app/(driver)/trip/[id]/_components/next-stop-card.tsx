// W24-D Phase 2 driver: refac Driver Run.html "02 · 운행 중 — 다음 정류장"
// .next-stop hero 픽셀 단위 align — refac CSS:
//
//   .next-stop{padding:18px;background:var(--card);border:1px solid var(--line);
//              border-radius:0;display:flex;flex-direction:column;gap:12px}
//   .next-stop-head{display:flex;justify-content:space-between;align-items:flex-start}
//   .next-stop-head .label{font-size:11px;font-weight:900;letter-spacing:0.06em;
//                          text-transform:uppercase;color:var(--bus);
//                          display:flex;align-items:center;gap:6px}
//   .next-stop .body{display:grid;grid-template-columns:1fr 130px;gap:16px;
//                    align-items:center}
//   .next-stop .big-name{font-size:28px;font-weight:900;letter-spacing:-0.025em;
//                        line-height:1.1;word-break:keep-all}
//   .next-stop .eta{display:flex;flex-direction:column;align-items:flex-end;
//                   gap:4px;text-align:right;border-left:1px solid var(--line);
//                   padding-left:16px}
//   .next-stop .eta-num{font-size:42px;font-weight:900;letter-spacing:-0.04em;
//                       line-height:1;color:var(--bus)}
//   .next-stop .eta-num .unit{font-size:18px;color:var(--mute);font-weight:700;
//                             margin-left:4px}
//   .next-stop .eta-meta{font-size:11px;color:var(--mute);font-weight:700;
//                        line-height:1.4;display:flex;flex-direction:column;gap:1px}
//   .next-stop .eta-meta strong{color:var(--ink);font-weight:800}
export function NextStopCard({
  nextStopName,
  nextStopOrder,
  totalStops,
  scheduledAt,
  waitingCount,
  etaMin,
}: {
  nextStopName: string;
  nextStopOrder: number;
  totalStops: number;
  scheduledAt: string;
  waitingCount: number;
  etaMin: number | null;
}) {
  return (
    <section className="bg-card border-border flex flex-col gap-[12px] border-y p-[18px]">
      {/* refac .next-stop-head: justify-between items-start */}
      <div className="flex items-start justify-between">
        {/* refac .label: 11px font-900 tracking-0.06em caps text-bus + live-dot */}
        <p className="text-bus inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.06em]">
          <span className="bg-bus h-1.5 w-1.5 animate-pulse rounded-full" />
          다음 정류장
        </p>
        <span className="text-muted-foreground text-[11px] font-extrabold">
          {nextStopOrder}번째 / {totalStops}
        </span>
      </div>
      {/* refac .body: grid 1fr 130px gap-16px items-center */}
      <div className="grid items-center gap-[16px] [grid-template-columns:1fr_130px]">
        {/* refac .big-name: 28px font-900 tracking-(-0.025em) line-1.1 break-keep */}
        <p className="text-[28px] font-black leading-[1.1] tracking-[-0.025em] break-keep">
          {nextStopName}
        </p>
        {/* refac .eta: flex flex-col items-end gap-4px text-right border-l pl-16px */}
        <div className="border-border flex flex-col items-end gap-1 border-l pl-[16px] text-right">
          {/* refac .eta-num: 42px font-900 tracking-(-0.04em) line-none color-bus */}
          <p className="text-bus text-[42px] font-black leading-none tracking-[-0.04em] tabular-nums">
            {etaMin !== null ? (
              <>
                {etaMin}
                {/* .unit: 18px mute font-700 ml-4px */}
                <span className="text-muted-foreground ml-1 text-[18px] font-bold">
                  분
                </span>
              </>
            ) : (
              <span className="text-muted-foreground text-[28px]">—</span>
            )}
          </p>
          {/* refac .eta-meta: 11px mute font-700 line-1.4, strong ink font-800 */}
          <div className="text-muted-foreground flex flex-col gap-px text-[11px] font-bold leading-[1.4]">
            <span>
              도착 <strong className="text-foreground font-extrabold">{scheduledAt}</strong>
            </span>
            <span>
              대기 <strong className="text-foreground font-extrabold">{waitingCount}명</strong>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
