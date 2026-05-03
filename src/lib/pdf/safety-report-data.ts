import { db } from "@/lib/db";

import { quarterRangeUtc, type Quarter } from "./quarter";

// 분기 안전운행기록 PDF에 들어갈 모든 데이터를 한 번에 모은다.
// 도교법 §53⑦ 의무 대상은 KIDS 모드 차량만.

export type SafetyReportRow = {
  date: string; // "YYYY-MM-DD"
  routeName: string;
  routeDirection: "PICKUP" | "DROPOFF";
  driverName: string;
  helperName: string | null;
  startedAt: string | null; // "HH:mm" KST
  endedAt: string | null;
  seatbeltAllOk: boolean | null; // null = SafetyCheck 없음 (출발 전 점검 안 함)
  helperPresent: boolean | null;
  allAlightedOk: boolean | null;
  notes: string | null; // 향후 비고 필드 추가 시 채울 자리. 현재는 null.
};

export type SafetyReportVehicle = {
  plate: string;
  reportNo: string | null; // 어린이통학버스 신고증명서 번호
  insuranceUntil: string | null; // "YYYY-MM-DD"
  rows: SafetyReportRow[];
};

export type SafetyReportData = {
  org: { name: string; type: "ACADEMY" | "DAYCARE" | "KINDERGARTEN" };
  year: number;
  quarter: Quarter;
  generatedAt: string; // ISO
  vehicles: SafetyReportVehicle[]; // KIDS 모드만, plate 오름차순
};

function fmtDateKst(d: Date): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function fmtTimeKst(d: Date | null): string | null {
  if (!d) return null;
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(11, 16);
}

export async function getSafetyReportData(
  orgId: string,
  year: number,
  quarter: Quarter,
): Promise<SafetyReportData> {
  const { start, endExclusive } = quarterRangeUtc(year, quarter);

  const [org, vehicles] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: orgId },
      select: { name: true, type: true },
    }),
    db.vehicle.findMany({
      where: { orgId, mode: "KIDS" },
      orderBy: { plate: "asc" },
      select: {
        id: true,
        plate: true,
        reportNo: true,
        insuranceUntil: true,
        trips: {
          where: {
            date: { gte: start, lt: endExclusive },
            startedAt: { not: null }, // 시작 안 한 trip은 제외
          },
          orderBy: [{ date: "asc" }, { startedAt: "asc" }],
          select: {
            date: true,
            startedAt: true,
            endedAt: true,
            route: { select: { name: true, direction: true } },
            driver: { select: { name: true } },
            helper: { select: { name: true } },
            safetyCheck: {
              select: {
                seatbeltAllOk: true,
                helperPresent: true,
                allAlightedOk: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    org,
    year,
    quarter,
    generatedAt: new Date().toISOString(),
    vehicles: vehicles.map((v) => ({
      plate: v.plate,
      reportNo: v.reportNo,
      insuranceUntil: v.insuranceUntil ? fmtDateKst(v.insuranceUntil) : null,
      rows: v.trips.map((t) => ({
        date: fmtDateKst(t.date),
        routeName: t.route.name,
        routeDirection: t.route.direction,
        driverName: t.driver.name,
        helperName: t.helper?.name ?? null,
        startedAt: fmtTimeKst(t.startedAt),
        endedAt: fmtTimeKst(t.endedAt),
        seatbeltAllOk: t.safetyCheck?.seatbeltAllOk ?? null,
        helperPresent: t.safetyCheck?.helperPresent ?? null,
        allAlightedOk: t.safetyCheck?.allAlightedOk ?? null,
        notes: null,
      })),
    })),
  };
}
