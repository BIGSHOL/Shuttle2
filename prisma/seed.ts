import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// 데모 데이터: 학원 1개(혼합형) + KIDS 차량 1대 + GENERAL 차량 1대
// 노선 2개(등원·하원), 정류장 4개(서울 강남역 부근), 학생·보호자 각 5명, 기사·동승자·학원장 각 1명

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL,
});
const db = new PrismaClient({ adapter });

const DEMO_ORG_NAME = "데모 학원·어린이집 (시드)";

async function main() {
  console.log("🌱 Seeding demo data…");

  // 기존 데모 데이터 정리 (cascade 안 걸려 있어서 자식부터 직접 제거).
  // ⚠️ 모든 deleteMany는 반드시 demo orgId로 필터해야 함 — 실사용자 데이터 보호.
  const existing = await db.organization.findFirst({
    where: { name: DEMO_ORG_NAME },
  });
  if (existing) {
    const orgId = existing.id;
    console.log(
      `  ↺ Found existing demo org ${orgId}, wiping demo children only…`,
    );
    await db.absenceRequest.deleteMany({ where: { student: { orgId } } });
    await db.locationPing.deleteMany({
      where: { trip: { vehicle: { orgId } } },
    });
    await db.boardingEvent.deleteMany({
      where: { trip: { vehicle: { orgId } } },
    });
    await db.safetyCheck.deleteMany({
      where: { trip: { vehicle: { orgId } } },
    });
    await db.trip.deleteMany({ where: { vehicle: { orgId } } });
    await db.routeStudent.deleteMany({
      where: { route: { vehicle: { orgId } } },
    });
    await db.routeStop.deleteMany({ where: { route: { vehicle: { orgId } } } });
    await db.guardianLink.deleteMany({ where: { student: { orgId } } });
    // Guardian은 orgId 컬럼이 없음. 데모가 만든 010-2000-* 번호만 남은 link 없을 때 삭제.
    await db.guardian.deleteMany({
      where: { phone: { startsWith: "010-2000-" }, links: { none: {} } },
    });
    await db.student.deleteMany({ where: { orgId } });
    await db.route.deleteMany({ where: { vehicle: { orgId } } });
    await db.stop.deleteMany({ where: { orgId } });
    await db.trainingRecord.deleteMany({ where: { staff: { orgId } } });
    await db.staff.deleteMany({ where: { orgId } });
    await db.vehicle.deleteMany({ where: { orgId } });
    await db.organization.delete({ where: { id: orgId } });
  }

  const org = await db.organization.create({
    data: {
      name: DEMO_ORG_NAME,
      type: "ACADEMY",
      plan: "TRIAL",
    },
  });
  console.log(`  ✓ Organization: ${org.id}`);

  const [kidsVehicle, generalVehicle] = await Promise.all([
    db.vehicle.create({
      data: {
        orgId: org.id,
        plate: "12가 3456",
        mode: "KIDS",
        reportNo: "DEMO-KIDS-001",
        insuranceUntil: new Date("2027-12-31"),
      },
    }),
    db.vehicle.create({
      data: {
        orgId: org.id,
        plate: "34나 5678",
        mode: "GENERAL",
      },
    }),
  ]);
  console.log(
    `  ✓ Vehicles: KIDS ${kidsVehicle.id}, GENERAL ${generalVehicle.id}`,
  );

  const [owner, driver, helper] = await Promise.all([
    db.staff.create({
      data: {
        orgId: org.id,
        name: "데모 학원장",
        phone: "010-1000-0001",
        role: "OWNER",
      },
    }),
    db.staff.create({
      data: {
        orgId: org.id,
        name: "데모 기사",
        phone: "010-1000-0002",
        role: "DRIVER",
      },
    }),
    db.staff.create({
      data: {
        orgId: org.id,
        name: "데모 동승자",
        phone: "010-1000-0003",
        role: "HELPER",
      },
    }),
  ]);
  console.log(`  ✓ Staff: ${owner.name}, ${driver.name}, ${helper.name}`);

  // 정류장 4개 — 서울 강남역 부근 (lat=37.4979, lng=127.0276 베이스)
  const stops = await Promise.all(
    [
      { name: "강남역 4번 출구 (데모)", lat: 37.4979, lng: 127.0276 },
      { name: "역삼역 1번 출구 (데모)", lat: 37.5006, lng: 127.0367 },
      { name: "신논현역 2번 출구 (데모)", lat: 37.5046, lng: 127.025 },
      { name: "양재역 8번 출구 (데모)", lat: 37.4854, lng: 127.0341 },
    ].map((s) =>
      db.stop.create({
        data: {
          orgId: org.id,
          name: s.name,
          lat: s.lat,
          lng: s.lng,
          radiusM: 50,
        },
      }),
    ),
  );
  console.log(`  ✓ Stops: ${stops.length}`);

  // 노선 2개 (등원/하원) — 둘 다 KIDS 차량에 (안전점검 데모를 위해)
  // 월·수·금 (1+4+16 = 21)
  const pickupRoute = await db.route.create({
    data: {
      vehicleId: kidsVehicle.id,
      name: "월수금 등원 (데모)",
      direction: "PICKUP",
      weekdays: 21,
    },
  });
  const dropoffRoute = await db.route.create({
    data: {
      vehicleId: kidsVehicle.id,
      name: "월수금 하원 (데모)",
      direction: "DROPOFF",
      weekdays: 21,
    },
  });
  console.log(`  ✓ Routes: ${pickupRoute.name}, ${dropoffRoute.name}`);

  // RouteStop 순서: PICKUP은 stop1→2→3→4, DROPOFF는 4→3→2→1
  await Promise.all([
    ...stops.map((s, i) =>
      db.routeStop.create({
        data: {
          routeId: pickupRoute.id,
          stopId: s.id,
          order: i + 1,
          scheduledAt: ["08:00", "08:10", "08:20", "08:30"][i] ?? "08:00",
        },
      }),
    ),
    ...[...stops].reverse().map((s, i) =>
      db.routeStop.create({
        data: {
          routeId: dropoffRoute.id,
          stopId: s.id,
          order: i + 1,
          scheduledAt: ["15:00", "15:10", "15:20", "15:30"][i] ?? "15:00",
        },
      }),
    ),
  ]);
  console.log(`  ✓ RouteStops: 8`);

  // 학생 5명 + 보호자 5명 (1:1 매핑, 모두 primary)
  // birthYear는 KIDS 모드 (13세 미만)에 맞도록 2018~2020년 사이
  const students = await Promise.all(
    [
      { name: "데모 학생 1", birthYear: 2018, stopIdx: 0 },
      { name: "데모 학생 2", birthYear: 2019, stopIdx: 1 },
      { name: "데모 학생 3", birthYear: 2020, stopIdx: 2 },
      { name: "데모 학생 4", birthYear: 2018, stopIdx: 3 },
      { name: "데모 학생 5", birthYear: 2019, stopIdx: 0 },
    ].map((s) =>
      db.student.create({
        data: { orgId: org.id, name: s.name, birthYear: s.birthYear },
      }),
    ),
  );

  const guardians = await Promise.all(
    students.map((s, i) =>
      db.guardian.create({
        data: {
          name: `${s.name}의 보호자`,
          phone: `010-2000-000${i + 1}`,
        },
      }),
    ),
  );

  await Promise.all(
    students.map((s, i) =>
      db.guardianLink.create({
        data: {
          studentId: s.id,
          guardianId: guardians[i]!.id,
          relation: "모",
          isPrimary: true,
        },
      }),
    ),
  );
  console.log(
    `  ✓ Students: ${students.length}, Guardians: ${guardians.length}`,
  );

  // 학생-노선 연결: 각 학생이 등원·하원 모두 같은 정류장 사용 (간단화)
  const stopAssignments = [0, 1, 2, 3, 0]; // 학생 i가 사용하는 stop index
  await Promise.all(
    students.flatMap((student, i) => [
      db.routeStudent.create({
        data: {
          routeId: pickupRoute.id,
          studentId: student.id,
          stopId: stops[stopAssignments[i]!]!.id,
        },
      }),
      db.routeStudent.create({
        data: {
          routeId: dropoffRoute.id,
          studentId: student.id,
          stopId: stops[stopAssignments[i]!]!.id,
        },
      }),
    ]),
  );
  console.log(`  ✓ RouteStudents: ${students.length * 2}`);

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
