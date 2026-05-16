// MakeEdu (school.makeedu.co.kr) 차량·정류장·노선·학생 데이터를
// 셔틀이 데모 org로 import. snapshot은 data/import/makeedu-snapshot.json.
//
// 사용:
//   pnpm dotenv -e .env.local -- pnpm tsx scripts/import-makeedu.ts
//
// 정책:
//  - 데모 org에 추가 (기존 데이터 보존, name 충돌 시 skip)
//  - 좌표 placeholder (대구시청) — 사용자가 /stops/[id]/edit picker로 수동
//  - weekdays = 31 (월~금)
//  - direction: wave별 승차/하차 majority로 auto
//  - birthYear: 학년 → 추정. 미상은 0 sentinel (사용자 수기 보강)

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { readFileSync } from "fs";

const ORG_ID = "cmouvi5ms0000vgufwyr2c53d";
const PLACEHOLDER_LAT = 35.8714;
const PLACEHOLDER_LNG = 128.6014;
const PLACEHOLDER_RADIUS = 50;
const WEEKDAYS_BITMASK = 31; // 월~금
const CURRENT_YEAR = 2026;

// 학년 → 나이 (대략 한국 학년 → 만 나이 + 1)
const GRADE_AGE: Record<string, number> = {
  "초1": 8, "초2": 9, "초3": 10, "초4": 11, "초5": 12, "초6": 13,
  "중1": 14, "중2": 15, "중3": 16,
  "고1": 17, "고2": 18, "고3": 19,
};

function gradeToBirthYear(grade: string): number {
  const age = GRADE_AGE[grade];
  if (!age) return 0; // sentinel — 사용자 수기 보강
  return CURRENT_YEAR - age;
}

type StopEntry = {
  rowIdx: number;
  order: string;
  rawName: string;
  scheduledAt: string;
  boardCount: number;
  alightCount: number;
  stopCode: string;
  students: { name: string; grade: string; raw: string }[];
};

type Snapshot = {
  scrapedAt: string;
  source: string;
  busLabels: Record<string, string>;
  buses: Record<string, StopEntry[]>;
};

// "1 학원 출발" → { wave: 1, name: "학원 출발" }
function parseWaveAndName(raw: string): { wave: number; name: string } | null {
  if (!raw) return null;
  const m = raw.match(/^(\d+)\s+(.+)$/);
  if (!m) return null;
  return { wave: parseInt(m[1]), name: m[2] };
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter });

  const snapshot: Snapshot = JSON.parse(
    readFileSync("data/import/makeedu-snapshot.json", "utf8"),
  );

  // 1. 고유 정류장·학생 collect
  const uniqueStopNames = new Set<string>();
  const uniqueStudents = new Map<string, string>(); // name → grade (first-seen)
  for (const [, stops] of Object.entries(snapshot.buses)) {
    for (const s of stops) {
      const parsed = parseWaveAndName(s.rawName);
      if (!parsed) continue;
      if (parsed.wave === 0) continue; // empty placeholder
      if (parsed.name === "학원 출발" || parsed.name === "학원 도착") continue;
      uniqueStopNames.add(parsed.name);
      for (const st of s.students) {
        if (!uniqueStudents.has(st.name)) {
          uniqueStudents.set(st.name, st.grade);
        }
      }
    }
  }

  console.log(`고유 정류장: ${uniqueStopNames.size}`);
  console.log(`고유 학생: ${uniqueStudents.size}`);

  // 2. Stop bulk upsert (orgId + name 기준)
  const stopByName = new Map<string, string>();
  for (const name of uniqueStopNames) {
    const existing = await db.stop.findFirst({ where: { orgId: ORG_ID, name } });
    if (existing) {
      stopByName.set(name, existing.id);
      continue;
    }
    const created = await db.stop.create({
      data: {
        orgId: ORG_ID,
        name,
        lat: PLACEHOLDER_LAT,
        lng: PLACEHOLDER_LNG,
        radiusM: PLACEHOLDER_RADIUS,
      },
    });
    stopByName.set(name, created.id);
  }

  // 3. Student bulk upsert (orgId + name 기준)
  const studentByName = new Map<string, string>();
  for (const [name, grade] of uniqueStudents) {
    const existing = await db.student.findFirst({ where: { orgId: ORG_ID, name } });
    if (existing) {
      studentByName.set(name, existing.id);
      continue;
    }
    const created = await db.student.create({
      data: {
        orgId: ORG_ID,
        name,
        birthYear: gradeToBirthYear(grade),
      },
    });
    studentByName.set(name, created.id);
  }

  // 4. Vehicle (plate = sourceName, mode=KIDS)
  const vehicleByCode = new Map<string, string>();
  for (const [code, label] of Object.entries(snapshot.busLabels)) {
    const existing = await db.vehicle.findFirst({
      where: { orgId: ORG_ID, plate: label },
    });
    if (existing) {
      vehicleByCode.set(code, existing.id);
      continue;
    }
    const created = await db.vehicle.create({
      data: { orgId: ORG_ID, plate: label, mode: "KIDS" },
    });
    vehicleByCode.set(code, created.id);
  }

  // 5. Route + RouteStop + RouteStudent (per wave)
  let routeCount = 0, routeStopCount = 0, routeStudentCount = 0;

  for (const [code, stops] of Object.entries(snapshot.buses)) {
    const vehicleId = vehicleByCode.get(code)!;
    const label = snapshot.busLabels[code];

    // Group stops by wave
    const byWave = new Map<number, StopEntry[]>();
    for (const s of stops) {
      const parsed = parseWaveAndName(s.rawName);
      if (!parsed || parsed.wave === 0) continue;
      if (!byWave.has(parsed.wave)) byWave.set(parsed.wave, []);
      byWave.get(parsed.wave)!.push(s);
    }

    for (const [waveNo, wstops] of byWave) {
      const totalBoard = wstops.reduce((a, s) => a + s.boardCount, 0);
      const totalAlight = wstops.reduce((a, s) => a + s.alightCount, 0);
      const direction: "PICKUP" | "DROPOFF" =
        totalBoard >= totalAlight ? "PICKUP" : "DROPOFF";

      const routeName = `${label} ${waveNo}차 (${direction === "PICKUP" ? "등원" : "하원"}) [import]`;

      // Route schema에 orgId 없음 — vehicleId로 derive
      const existingRoute = await db.route.findFirst({
        where: { vehicleId, name: routeName, direction },
      });
      if (existingRoute) continue;

      const route = await db.route.create({
        data: {
          name: routeName,
          direction,
          vehicleId,
          weekdays: WEEKDAYS_BITMASK,
        },
      });
      routeCount++;

      // RouteStop — skip 학원 출발/도착 (학원 자체)
      const stopsForRoute = wstops.filter((s) => {
        const parsed = parseWaveAndName(s.rawName);
        return parsed && parsed.name !== "학원 출발" && parsed.name !== "학원 도착";
      });

      for (let idx = 0; idx < stopsForRoute.length; idx++) {
        const s = stopsForRoute[idx];
        const parsed = parseWaveAndName(s.rawName)!;
        const stopId = stopByName.get(parsed.name);
        if (!stopId) continue;
        await db.routeStop.create({
          data: {
            routeId: route.id,
            stopId,
            order: idx + 1,
            scheduledAt: s.scheduledAt,
          },
        });
        routeStopCount++;

        for (const st of s.students) {
          const studentId = studentByName.get(st.name);
          if (!studentId) continue;
          const exists = await db.routeStudent.findUnique({
            where: { routeId_studentId: { routeId: route.id, studentId } },
          });
          if (exists) continue;
          await db.routeStudent.create({
            data: { routeId: route.id, studentId, stopId },
          });
          routeStudentCount++;
        }
      }
    }
  }

  console.log("");
  console.log(`✅ import 완료 (orgId=${ORG_ID}):`);
  console.log(`  vehicles:       ${vehicleByCode.size}`);
  console.log(`  stops:          ${stopByName.size}`);
  console.log(`  students:       ${studentByName.size}`);
  console.log(`  routes:         ${routeCount}`);
  console.log(`  routeStops:     ${routeStopCount}`);
  console.log(`  routeStudents:  ${routeStudentCount}`);

  // 미상 학년 학생 명단 출력
  const noGradeStudents = [...uniqueStudents.entries()].filter(([, g]) => !g || !GRADE_AGE[g]);
  if (noGradeStudents.length > 0) {
    console.log("");
    console.log(`⚠️  학년 미상 학생 ${noGradeStudents.length}명 (birthYear=0 sentinel):`);
    for (const [name, grade] of noGradeStudents) {
      console.log(`  - ${name}${grade ? ` (raw grade: "${grade}")` : ""}`);
    }
    console.log("");
    console.log("→ /students 페이지에서 각 학생 행을 열어 birthYear 수기 입력 필요");
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
