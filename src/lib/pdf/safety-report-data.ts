import { db } from "@/lib/db";
import { haversineMeters } from "@/lib/geo/distance";

import { quarterRangeUtc, type Quarter } from "./quarter";

// 분기 안전운행기록 PDF에 들어갈 모든 데이터를 한 번에 모은다.
// 도로교통법 §53⑦ 의무 대상은 KIDS 모드 차량만.

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
  // GPS 요약 (LocationPing 기반, 면책 자료).
  // distanceKm: 누적 거리, pingCount: 영구 저장된 ping 개수.
  // null = ping 데이터 없음(GPS 미지원·운행 미시작 등).
  gpsDistanceKm: number | null;
  gpsPingCount: number | null;
  notes: string | null;
};

export type SafetyReportVehicle = {
  plate: string;
  reportNo: string | null; // 어린이통학버스 신고증명서 번호
  insuranceUntil: string | null; // "YYYY-MM-DD"
  totalDistanceKm: number; // 분기 누적 거리 (헤더 표시용)
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
            pings: {
              orderBy: { recordedAt: "asc" },
              select: { lat: true, lng: true },
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
    vehicles: vehicles.map((v) => {
      const rows = v.trips.map((t) => {
        const pings = t.pings;
        let distMeters = 0;
        for (let i = 1; i < pings.length; i++) {
          distMeters += haversineMeters(
            pings[i - 1].lat,
            pings[i - 1].lng,
            pings[i].lat,
            pings[i].lng,
          );
        }
        const hasPings = pings.length > 0;
        return {
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
          gpsDistanceKm: hasPings ? +(distMeters / 1000).toFixed(2) : null,
          gpsPingCount: hasPings ? pings.length : null,
          notes: null,
        };
      });
      const totalDistanceKm = +rows
        .reduce((sum, r) => sum + (r.gpsDistanceKm ?? 0), 0)
        .toFixed(1);
      return {
        plate: v.plate,
        reportNo: v.reportNo,
        insuranceUntil: v.insuranceUntil ? fmtDateKst(v.insuranceUntil) : null,
        totalDistanceKm,
        rows,
      };
    }),
  };
}
