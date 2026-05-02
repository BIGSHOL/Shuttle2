// 데모 데이터 시드. 멀티테넌시 검증·UI 개발 편의용이며 운영 DB에는 절대 투입 금지.
// 모든 name 필드에 "[데모]" 접두를 붙여 운영 데이터와 시각적으로 구분한다.
// 재실행 시 중복 생성을 막기 위해 학원명으로 기존 레코드를 찾으면 스킵.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_ORG_NAME = "[데모] 강남샘플학원·어린이집";

// 강남역(37.4979, 127.0276) 주변 가상의 4개 정류장.
const STOPS = [
  { name: "[데모] 강남역 12번 출구 앞", lat: 37.4979, lng: 127.0276 },
  { name: "[데모] 역삼푸르지오 정문", lat: 37.5005, lng: 127.0367 },
  { name: "[데모] 선릉로 어린이공원", lat: 37.5051, lng: 127.0492 },
  { name: "[데모] 학원 본관 앞", lat: 37.4945, lng: 127.0312 },
];

// 비트마스크: 월=1 화=2 수=4 목=8 금=16 토=32 일=64 (월수금 = 1|4|16 = 21)
const MON_WED_FRI = 1 | 4 | 16;

async function main() {
  const existing = await prisma.organization.findFirst({
    where: { name: DEMO_ORG_NAME },
  });
  if (existing) {
    console.log(`Demo org already exists (id=${existing.id}). Skipping seed.`);
    return;
  }

  const org = await prisma.organization.create({
    data: {
      name: DEMO_ORG_NAME,
      type: "ACADEMY",
      plan: "TRIAL",
    },
  });

  const stops = await Promise.all(
    STOPS.map((s) =>
      prisma.stop.create({
        data: {
          orgId: org.id,
          name: s.name,
          lat: s.lat,
          lng: s.lng,
          // radiusM은 기본값 50 사용
        },
      }),
    ),
  );

  const [kidsVehicle, generalVehicle] = await Promise.all([
    prisma.vehicle.create({
      data: {
        orgId: org.id,
        plate: "[데모] 12가 3456",
        mode: "KIDS",
        reportNo: "DEMO-KIDS-0001",
        insuranceUntil: new Date("2026-12-31"),
      },
    }),
    prisma.vehicle.create({
      data: {
        orgId: org.id,
        plate: "[데모] 78나 9012",
        mode: "GENERAL",
      },
    }),
  ]);

  const owner = await prisma.staff.create({
    data: {
      orgId: org.id,
      name: "[데모] 김원장",
      phone: "010-0000-0001",
      role: "OWNER",
    },
  });
  const driver = await prisma.staff.create({
    data: {
      orgId: org.id,
      name: "[데모] 박기사",
      phone: "010-0000-0002",
      role: "DRIVER",
    },
  });
  const helper = await prisma.staff.create({
    data: {
      orgId: org.id,
      name: "[데모] 이동승",
      phone: "010-0000-0003",
      role: "HELPER",
    },
  });

  // 노선 2개: 등원(KIDS 차량), 하원(KIDS 차량). GENERAL 차량은 노선 미배정 상태로 둔다.
  const pickup = await prisma.route.create({
    data: {
      vehicleId: kidsVehicle.id,
      name: "[데모] 월수금 등원 1코스",
      direction: "PICKUP",
      weekdays: MON_WED_FRI,
    },
  });
  const dropoff = await prisma.route.create({
    data: {
      vehicleId: kidsVehicle.id,
      name: "[데모] 월수금 하원 1코스",
      direction: "DROPOFF",
      weekdays: MON_WED_FRI,
    },
  });

  // 등원: 0→1→2→3 (학원 본관이 마지막). 하원: 3→2→1→0.
  const pickupOrder = [0, 1, 2, 3];
  const dropoffOrder = [3, 2, 1, 0];
  const pickupTimes = ["08:00", "08:10", "08:20", "08:30"];
  const dropoffTimes = ["17:00", "17:10", "17:20", "17:30"];

  await Promise.all(
    pickupOrder.map((stopIdx, i) =>
      prisma.routeStop.create({
        data: {
          routeId: pickup.id,
          stopId: stops[stopIdx].id,
          order: i,
          scheduledAt: pickupTimes[i],
        },
      }),
    ),
  );
  await Promise.all(
    dropoffOrder.map((stopIdx, i) =>
      prisma.routeStop.create({
        data: {
          routeId: dropoff.id,
          stopId: stops[stopIdx].id,
          order: i,
          scheduledAt: dropoffTimes[i],
        },
      }),
    ),
  );

  // 학생 5명 + 보호자 5명 + 1:1 연결 + 등원·하원 노선 등록
  const STUDENTS = [
    { name: "[데모] 학생 가", birthYear: 2018, stopIdx: 0 },
    { name: "[데모] 학생 나", birthYear: 2017, stopIdx: 1 },
    { name: "[데모] 학생 다", birthYear: 2016, stopIdx: 1 },
    { name: "[데모] 학생 라", birthYear: 2015, stopIdx: 2 },
    { name: "[데모] 학생 마", birthYear: 2014, stopIdx: 2 },
  ];

  for (let i = 0; i < STUDENTS.length; i++) {
    const s = STUDENTS[i];
    const student = await prisma.student.create({
      data: {
        orgId: org.id,
        name: s.name,
        birthYear: s.birthYear,
      },
    });
    const guardian = await prisma.guardian.create({
      data: {
        name: `[데모] 보호자 ${i + 1}`,
        phone: `010-1000-${String(i + 1).padStart(4, "0")}`,
      },
    });
    await prisma.guardianLink.create({
      data: {
        studentId: student.id,
        guardianId: guardian.id,
        relation: "모",
        isPrimary: true,
      },
    });
    await prisma.routeStudent.create({
      data: {
        routeId: pickup.id,
        studentId: student.id,
        stopId: stops[s.stopIdx].id,
      },
    });
    await prisma.routeStudent.create({
      data: {
        routeId: dropoff.id,
        studentId: student.id,
        stopId: stops[s.stopIdx].id,
      },
    });
  }

  console.log("Seed complete:");
  console.log(`  org: ${org.name} (${org.id})`);
  console.log(`  vehicles: ${kidsVehicle.plate}, ${generalVehicle.plate}`);
  console.log(
    `  staff: owner=${owner.name}, driver=${driver.name}, helper=${helper.name}`,
  );
  console.log(`  stops: ${stops.length}, routes: 2 (PICKUP/DROPOFF)`);
  console.log(`  students: ${STUDENTS.length} with 1 guardian each`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
