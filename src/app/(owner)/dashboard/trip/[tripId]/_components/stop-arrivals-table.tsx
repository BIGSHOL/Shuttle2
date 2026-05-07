import { formatDuration, type StopArrival } from "@/lib/geo/trip-stats";

// W19-D: 정류장별 도착 시각·구간 소요시간 표.
// LocationPing.source = STOP_PASS의 첫 ping을 도착 시각으로 사용.
// 모바일은 카드 stack, 데스크톱은 표 (W18 패턴).

function fmtKstHHmm(d: Date): string {
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(11, 16);
}

export type StopArrivalRow = StopArrival & {
  boardCount: number; // 해당 정류장 BoardingEvent BOARD/ALIGHT 처리 건수
  noShowCount: number; // 미탑승·미하차
};

export function StopArrivalsTable({ rows }: { rows: StopArrivalRow[] }) {
  if (rows.length === 0) return null;

  return (
    <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-extrabold tracking-tight">
          정류장 도착 시각
        </h3>
        <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
          기사 폰이 정류장 반경 진입 시 자동 기록 (STOP_PASS). 직전 구간 소요는
          이전 정류장 통과부터 현재까지.
        </p>
      </div>

      {/* 모바일/태블릿: 카드 stack */}
      <ul className="space-y-2 p-3 lg:hidden">
        {rows.map((r) => (
          <li key={r.stopId}>
            <div className="bg-card rounded-lg border p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                      {r.stopOrder}
                    </span>
                    <h4 className="text-sm font-extrabold tracking-tight">
                      {r.stopName}
                    </h4>
                  </div>
                  <p className="text-muted-foreground mt-1.5 text-xs font-medium">
                    {r.arrivedAt ? (
                      <>
                        도착 {fmtKstHHmm(r.arrivedAt)}
                        {r.segmentSec !== null
                          ? ` · 구간 ${formatDuration(r.segmentSec)}`
                          : ""}
                      </>
                    ) : (
                      <span className="text-muted-foreground/60">
                        통과 기록 없음
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {r.boardCount > 0 ? (
                    <span className="bg-success-soft text-success rounded-md px-1.5 py-0.5 text-[10px] font-bold">
                      처리 {r.boardCount}
                    </span>
                  ) : null}
                  {r.noShowCount > 0 ? (
                    <span className="bg-destructive/10 text-destructive rounded-md px-1.5 py-0.5 text-[10px] font-bold">
                      미탑승 {r.noShowCount}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* 데스크톱: 표 */}
      <div className="hidden lg:block">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr className="text-muted-foreground text-left">
              <th className="w-12 px-3 py-2 text-center text-[11px] font-bold tracking-wide uppercase">
                #
              </th>
              <th className="px-3 py-2 text-[11px] font-bold tracking-wide uppercase">
                정류장
              </th>
              <th className="w-24 px-3 py-2 text-[11px] font-bold tracking-wide uppercase">
                도착 시각
              </th>
              <th className="w-24 px-3 py-2 text-[11px] font-bold tracking-wide uppercase">
                구간 소요
              </th>
              <th className="pr-[18px] pl-3 py-2 text-right text-[11px] font-bold tracking-wide uppercase">
                탑승·미탑승
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.stopId} className="border-b last:border-0">
                <td className="text-muted-foreground px-3 py-2 text-center font-mono text-xs">
                  {r.stopOrder}
                </td>
                <td className="px-3 py-2 font-medium">{r.stopName}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {r.arrivedAt ? (
                    fmtKstHHmm(r.arrivedAt)
                  ) : (
                    <span className="text-muted-foreground/60">—</span>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {r.segmentSec !== null ? (
                    formatDuration(r.segmentSec)
                  ) : (
                    <span className="text-muted-foreground/60">—</span>
                  )}
                </td>
                <td className="pr-[18px] pl-3 py-2 text-right text-xs">
                  <span className="space-x-1.5">
                    {r.boardCount > 0 ? (
                      <span className="bg-success-soft text-success rounded-md px-1.5 py-0.5 text-[10px] font-bold">
                        {r.boardCount}
                      </span>
                    ) : null}
                    {r.noShowCount > 0 ? (
                      <span className="bg-destructive/10 text-destructive rounded-md px-1.5 py-0.5 text-[10px] font-bold">
                        미탑승 {r.noShowCount}
                      </span>
                    ) : null}
                    {r.boardCount === 0 && r.noShowCount === 0 ? (
                      <span className="text-muted-foreground/60">—</span>
                    ) : null}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
