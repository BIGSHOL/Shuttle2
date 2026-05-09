import { AlertTriangle, BarChart3, Bus, ClipboardCheck, Gauge } from "lucide-react";

import { KpiStrip, KpiStripCell } from "@/components/kpi-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";
import {
  currentKstQuarter,
  quarterMonthsLabel,
  type Quarter,
} from "@/lib/pdf/quarter";

import { ReportDownloadForm } from "./report-download-form";
import { StudentAttendanceTable } from "./student-attendance-table";

const DOW_KO_SHORT = ["일", "월", "화", "수", "목", "금", "토"] as const;

export default async function SafetyReportPage() {
  const me = await requireOwner();
  const orgId = await getOrgId();
  const cur = currentKstQuarter();

  // 7일치 운행 통계 (KPI strip + 일별 차트).
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6); // 오늘 포함 7일

  const [
    kidsVehicleCount,
    sevenDayTripCount,
    safetyChecks,
    noShowCount,
    sevenDayTrips,
  ] = await Promise.all([
    db.vehicle.count({ where: { orgId, mode: "KIDS" } }),
    db.trip.count({
      where: { vehicle: { orgId }, date: { gte: sevenDaysAgo } },
    }),
    db.safetyCheck.findMany({
      where: {
        trip: { vehicle: { orgId }, date: { gte: sevenDaysAgo } },
      },
      select: {
        seatbeltAllOk: true,
        helperPresent: true,
        allAlightedOk: true,
      },
    }),
    db.boardingEvent.count({
      where: {
        type: "NO_SHOW",
        trip: { vehicle: { orgId }, date: { gte: sevenDaysAgo } },
      },
    }),
    db.trip.findMany({
      where: { vehicle: { orgId }, date: { gte: sevenDaysAgo } },
      select: {
        date: true,
        startedAt: true,
        endedAt: true,
        routeId: true,
        driverId: true,
        route: {
          select: {
            name: true,
            direction: true,
            stops: {
              orderBy: { order: "asc" },
              take: 1,
              select: { scheduledAt: true },
            },
            _count: { select: { students: true } },
          },
        },
        driver: { select: { name: true } },
        safetyCheck: { select: { id: true } },
        _count: { select: { events: true } },
      },
    }),
  ]);

  // 안전점검 통과율 — 3개 항목 모두 true / 항목 합계.
  const safetyTotal = safetyChecks.length * 3;
  const safetyPassed = safetyChecks.reduce(
    (acc, c) =>
      acc +
      (c.seatbeltAllOk ? 1 : 0) +
      (c.helperPresent ? 1 : 0) +
      (c.allAlightedOk ? 1 : 0),
    0,
  );
  const safetyRate = safetyTotal > 0 ? Math.round((safetyPassed / safetyTotal) * 100) : null;

  // 일별 등원·하원 trip 카운트 (7일).
  const dailyMap = new Map<string, { pickup: number; dropoff: number }>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { pickup: 0, dropoff: 0 });
  }
  for (const t of sevenDayTrips) {
    const key = t.date.toISOString().slice(0, 10);
    const entry = dailyMap.get(key);
    if (!entry) continue;
    if (t.route.direction === "PICKUP") entry.pickup += 1;
    else entry.dropoff += 1;
  }
  const dailyEntries = Array.from(dailyMap.entries()).map(([date, v]) => ({
    date,
    ...v,
    total: v.pickup + v.dropoff,
  }));
  const maxDaily = Math.max(1, ...dailyEntries.map((e) => e.total));

  // W25 P2-A: 노선별 성과 — 정시율 계산 (startedAt vs route 첫 stop scheduledAt).
  const routeStats = new Map<
    string,
    {
      name: string;
      direction: "PICKUP" | "DROPOFF";
      tripCount: number;
      onTimeCount: number;
      finishedCount: number;
      noShowSum: number;
      studentCapacity: number;
      eventSum: number;
    }
  >();
  for (const t of sevenDayTrips) {
    const cur = routeStats.get(t.routeId) ?? {
      name: t.route.name,
      direction: t.route.direction,
      tripCount: 0,
      onTimeCount: 0,
      finishedCount: 0,
      noShowSum: 0,
      studentCapacity: t.route._count.students,
      eventSum: 0,
    };
    cur.tripCount += 1;
    if (t.endedAt) {
      cur.finishedCount += 1;
      // 정시율: scheduledAt(HH:mm) vs startedAt KST HH:mm 차이 5분 내
      const scheduled = t.route.stops[0]?.scheduledAt;
      if (scheduled && t.startedAt) {
        const [sh, sm] = scheduled.split(":").map(Number);
        if (Number.isFinite(sh) && Number.isFinite(sm)) {
          const startedKst = new Date(t.startedAt.getTime() + 9 * 60 * 60 * 1000);
          const startMin = startedKst.getUTCHours() * 60 + startedKst.getUTCMinutes();
          const schedMin = sh * 60 + sm;
          if (Math.abs(startMin - schedMin) <= 5) cur.onTimeCount += 1;
        }
      }
    }
    cur.eventSum += t._count.events;
    routeStats.set(t.routeId, cur);
  }
  const routeRows = Array.from(routeStats.entries())
    .map(([id, v]) => ({
      id,
      ...v,
      onTimeRate:
        v.finishedCount > 0
          ? Math.round((v.onTimeCount / v.finishedCount) * 100)
          : null,
      occupancy:
        v.studentCapacity > 0
          ? Math.round((v.eventSum / (v.tripCount * v.studentCapacity)) * 100)
          : null,
    }))
    .sort((a, b) => (b.onTimeRate ?? -1) - (a.onTimeRate ?? -1));

  // 기사별 KPI
  const driverStats = new Map<
    string,
    {
      name: string;
      tripCount: number;
      finishedCount: number;
      onTimeCount: number;
      safetyOkCount: number;
    }
  >();
  for (const t of sevenDayTrips) {
    const cur = driverStats.get(t.driverId) ?? {
      name: t.driver?.name ?? "—",
      tripCount: 0,
      finishedCount: 0,
      onTimeCount: 0,
      safetyOkCount: 0,
    };
    cur.tripCount += 1;
    if (t.endedAt) {
      cur.finishedCount += 1;
      const scheduled = t.route.stops[0]?.scheduledAt;
      if (scheduled && t.startedAt) {
        const [sh, sm] = scheduled.split(":").map(Number);
        if (Number.isFinite(sh) && Number.isFinite(sm)) {
          const startedKst = new Date(t.startedAt.getTime() + 9 * 60 * 60 * 1000);
          const startMin = startedKst.getUTCHours() * 60 + startedKst.getUTCMinutes();
          const schedMin = sh * 60 + sm;
          if (Math.abs(startMin - schedMin) <= 5) cur.onTimeCount += 1;
        }
      }
      if (t.safetyCheck) cur.safetyOkCount += 1;
    }
    driverStats.set(t.driverId, cur);
  }
  const driverRows = Array.from(driverStats.entries())
    .map(([id, v]) => ({
      id,
      ...v,
      onTimeRate:
        v.finishedCount > 0
          ? Math.round((v.onTimeCount / v.finishedCount) * 100)
          : null,
      safetyRate:
        v.finishedCount > 0
          ? Math.round((v.safetyOkCount / v.finishedCount) * 100)
          : null,
    }))
    .sort((a, b) => (b.onTimeRate ?? -1) - (a.onTimeRate ?? -1));

  // 학생 출석 분석 — BoardingEvent group by studentId
  const sevenDayBoardingEvents = await db.boardingEvent.findMany({
    where: {
      trip: { vehicle: { orgId }, date: { gte: sevenDaysAgo } },
    },
    select: {
      studentId: true,
      type: true,
      student: { select: { name: true } },
    },
  });
  const studentStats = new Map<
    string,
    {
      name: string;
      board: number;
      noShow: number;
      total: number;
    }
  >();
  for (const e of sevenDayBoardingEvents) {
    const cur = studentStats.get(e.studentId) ?? {
      name: e.student.name,
      board: 0,
      noShow: 0,
      total: 0,
    };
    cur.total += 1;
    if (e.type === "BOARD" || e.type === "ALIGHT") cur.board += 1;
    if (e.type === "NO_SHOW" || e.type === "NO_DROPOFF") cur.noShow += 1;
    studentStats.set(e.studentId, cur);
  }
  const studentRows = Array.from(studentStats.entries())
    .map(([id, v]) => ({
      id,
      ...v,
      noShowRate: v.total > 0 ? Math.round((v.noShow / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.noShow - a.noShow);

  // 분기 옵션 — 현재 분기부터 과거 4개(=1년치)만 노출. 끝없이 나열되지 않도록.
  // 안전운행기록 보관 의무는 3년이지만, 다운로드 시점에서 흔히 필요한 건 직전 1년.
  // 더 과거 분기 필요 시 향후 "전체 보기" 토글 추가 가능 (베타에선 1년치 충분).
  const QUARTER_HISTORY_COUNT = 4;
  const quarters: { value: { year: number; quarter: Quarter }; label: string }[] = [];
  let qYear = cur.year;
  let qQ = cur.quarter as number;
  for (let i = 0; i < QUARTER_HISTORY_COUNT; i++) {
    quarters.push({
      value: { year: qYear, quarter: qQ as Quarter },
      label: `${qYear}년 ${qQ}분기 (${quarterMonthsLabel(qYear, qQ as Quarter).split(" ").slice(1).join(" ")})`,
    });
    qQ -= 1;
    if (qQ < 1) {
      qQ = 4;
      qYear -= 1;
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 lg:p-6">
      {/* 페이지 헤더 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight lg:text-3xl">
            안전운행기록·리포트
          </h2>
          <p className="text-muted-foreground mt-1 text-xs font-semibold lg:text-sm">
            7일 운행·안전점검·미탑승 통합 통계 + 분기별 법정 안전운행기록
            (별지 제20호의2) PDF.
          </p>
        </div>
      </div>

      {/* KPI 5 — 7일 통계 */}
      <KpiStrip cols={5}>
        <KpiStripCell
          label="7일 총 운행"
          value={`${sevenDayTripCount}건`}
          subtext="등원·하원 합산"
          Icon={Bus}
          tone="info"
        />
        <KpiStripCell
          label="안전점검 통과율"
          value={safetyRate != null ? `${safetyRate}%` : "—"}
          subtext={
            safetyChecks.length > 0
              ? `${safetyChecks.length}건 점검`
              : "점검 데이터 없음"
          }
          Icon={ClipboardCheck}
          tone={safetyRate != null && safetyRate < 95 ? "warning" : "success"}
        />
        <KpiStripCell
          label="미탑승"
          value={`${noShowCount}건`}
          subtext={noShowCount > 0 ? "최근 7일 누적" : "이상 없음"}
          Icon={AlertTriangle}
          tone={noShowCount > 0 ? "destructive" : "success"}
        />
        <KpiStripCell
          label="어린이용 차량"
          value={`${kidsVehicleCount}대`}
          subtext="법정 안전운행기록 대상"
          Icon={Bus}
          tone="bus"
        />
        <KpiStripCell
          label="이번 분기"
          value={`${cur.year} Q${cur.quarter}`}
          subtext={quarterMonthsLabel(cur.year, cur.quarter)}
          Icon={Gauge}
          tone="muted"
        />
      </KpiStrip>

      {/* 일별 운행량 차트 — CSS bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="text-muted-foreground h-4 w-4" />
            일별 운행량 (최근 7일)
          </CardTitle>
          <CardDescription>
            등원·하원 운행 건수. 회색 bar 위 노란 strip = 등원, 파랑 = 하원.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {dailyEntries.map((e) => {
              const d = new Date(`${e.date}T00:00:00Z`);
              const dow = DOW_KO_SHORT[d.getUTCDay()];
              const day = d.getUTCDate();
              const pickupHeight = (e.pickup / maxDaily) * 100;
              const dropoffHeight = (e.dropoff / maxDaily) * 100;
              return (
                <div key={e.date} className="flex flex-col items-center gap-1.5">
                  <div className="bg-muted relative flex h-32 w-full flex-col-reverse overflow-hidden rounded-md">
                    {pickupHeight > 0 ? (
                      <div
                        className="bg-bus w-full"
                        style={{ height: `${pickupHeight}%` }}
                        title={`등원 ${e.pickup}건`}
                      />
                    ) : null}
                    {dropoffHeight > 0 ? (
                      <div
                        className="bg-info w-full"
                        style={{ height: `${dropoffHeight}%` }}
                        title={`하원 ${e.dropoff}건`}
                      />
                    ) : null}
                  </div>
                  <p className="text-muted-foreground text-[10px] font-bold tabular-nums">
                    {day} ({dow})
                  </p>
                  <p className="text-xs font-extrabold tabular-nums">
                    {e.total}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* W25 P2-A: 노선별 성과 — 정시율 ↓ 정렬 + horizontal progress */}
      {routeRows.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">노선별 성과</CardTitle>
            <CardDescription>
              최근 7일 운행. 정시율 = 첫 정류장 예정 시각 ±5분 내 출발 비율.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {routeRows.map((r) => (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-extrabold tracking-tight">
                      {r.name}
                      <span className="text-muted-foreground ml-1.5 text-[11px] font-bold">
                        · {r.direction === "PICKUP" ? "등원" : "하원"} ·{" "}
                        {r.tripCount}회
                      </span>
                    </p>
                    <span className="tabular-nums text-sm font-black">
                      {r.onTimeRate != null ? `${r.onTimeRate}%` : "—"}
                    </span>
                  </div>
                  <div className="bg-muted mt-2 h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className={
                        r.onTimeRate != null && r.onTimeRate >= 95
                          ? "bg-success h-full"
                          : r.onTimeRate != null && r.onTimeRate >= 80
                            ? "bg-bus h-full"
                            : "bg-warning h-full"
                      }
                      style={{ width: `${r.onTimeRate ?? 0}%` }}
                    />
                  </div>
                  <p className="text-muted-foreground mt-1.5 text-[10px] font-semibold">
                    탑승 {r.eventSum}회 · 가동률{" "}
                    {r.occupancy != null ? `${r.occupancy}%` : "—"}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* W25 P2-A: 기사별 KPI 표 */}
      {driverRows.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">기사별 KPI</CardTitle>
            <CardDescription>
              최근 7일. 정시율·안전점검 통과율 기준 정렬.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-[10px] font-extrabold tracking-wide uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">기사</th>
                    <th className="px-2 py-2 text-right">운행</th>
                    <th className="px-2 py-2 text-right">완료</th>
                    <th className="px-2 py-2 text-right">정시율</th>
                    <th className="px-4 py-2 text-right">점검 통과</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {driverRows.map((d) => (
                    <tr key={d.id}>
                      <td className="px-4 py-2.5 font-bold tracking-tight">
                        {d.name}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums font-semibold">
                        {d.tripCount}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums font-semibold">
                        {d.finishedCount}
                      </td>
                      <td
                        className={`px-2 py-2.5 text-right tabular-nums font-extrabold ${
                          d.onTimeRate != null && d.onTimeRate >= 95
                            ? "text-success"
                            : d.onTimeRate != null && d.onTimeRate < 80
                              ? "text-warning"
                              : ""
                        }`}
                      >
                        {d.onTimeRate != null ? `${d.onTimeRate}%` : "—"}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right tabular-nums font-extrabold ${
                          d.safetyRate != null && d.safetyRate >= 95
                            ? "text-success"
                            : d.safetyRate != null && d.safetyRate < 80
                              ? "text-destructive"
                              : ""
                        }`}
                      >
                        {d.safetyRate != null ? `${d.safetyRate}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* W25 P2-A: 학생 출석 분석 — 검색·상태 필터·페이지네이션 (client) */}
      {studentRows.length > 0 ? (
        <StudentAttendanceTable rows={studentRows} />
      ) : null}

      {/* 분기 선택 PDF — 기존 폼 그대로 */}
      {kidsVehicleCount === 0 ? (
        <Card className="border-warning/40 bg-warning-soft/40">
          <CardHeader>
            <CardTitle className="text-warning text-base">
              어린이용 모드 차량이 없어요
            </CardTitle>
            <CardDescription>
              차량 등록 시 모드를 어린이용으로 설정해야 안전운행기록 누적 대상이
              됩니다. 차량 화면에서 차량을 어린이용으로 변경해 주세요.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">분기별 PDF 다운로드</CardTitle>
            <CardDescription>
              현재 분기는 {cur.year}년 {cur.quarter}분기입니다.{" "}
              {me.org.name}의 어린이용 차량 운행 + 안전점검 데이터를 분기별로
              PDF로 묶어 다운로드합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReportDownloadForm options={quarters} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">PDF에 포함되는 항목</CardTitle>
          <CardDescription>
            차량별로 운행 일자·시각·노선·운전자·동승보호자, 그리고 출발 전
            안전띠 점검 / 동승보호자 동승 / 운행 종료 후 전원 하차 확인
            결과(✓/✗/-)가 표로 들어갑니다. 점검 항목이 비어 있으면 -로 표시.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
