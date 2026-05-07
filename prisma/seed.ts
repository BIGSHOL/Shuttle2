import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// 데모 데이터: 학원 1개(혼합형) + KIDS 차량 1대 + GENERAL 차량 1대
// 노선 2개(등원·하원), 정류장 4개(서울 강남역 부근), 학생·보호자 각 5명, 기사·동승자·학원장 각 1명
//
// E2E 테스트 가능하도록 Supabase Auth user도 함께 생성. 모두 비번 demo1234! 통일.
// loginId/recoveryEmail은 실제 흐름 검증용.
//
// ⚠️ cleanup 시 @shuttlee-demo.local·@shuttlee.local 도메인의 Auth user만 삭제.
// 실 사용자 데이터에 영향 X. 그래도 production DB에 데모 데이터 들어가는 점 주의.

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL,
});
const db = new PrismaClient({ adapter });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "❌ NEXT_PUBLIC_SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다",
  );
  process.exit(1);
}
const admin = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_ORG_NAME = "데모 학원·어린이집 (시드)";
const DEMO_PASSWORD = "demo1234!";
const DEMO_OWNER_EMAIL = "demo-owner@shuttlee-demo.local";

function loginIdEmail(loginId: string): string {
  return `${loginId.toLowerCase()}@shuttlee.local`;
}

async function main() {
  console.log("🌱 Seeding demo data…");

  // ─── 기존 데모 데이터 정리 (cascade 미설정이라 자식부터 직접) ───
  const existing = await db.organization.findFirst({
    where: { name: DEMO_ORG_NAME },
  });
  if (existing) {
    const orgId = existing.id;
    console.log(
      `  ↺ Found existing demo org ${orgId}, wiping demo children only…`,
    );
    await db.absenceRequest.deleteMany({ where: { student: { orgId } } });
    await db.stopChangeRequest.deleteMany({ where: { orgId } });
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
    await db.guardian.deleteMany({
      where: { phone: { startsWith: "010-2000-" }, links: { none: {} } },
    });
    await db.student.deleteMany({ where: { orgId } });
    await db.route.deleteMany({ where: { vehicle: { orgId } } });
    await db.stop.deleteMany({ where: { orgId } });
    await db.trainingRecord.deleteMany({ where: { staff: { orgId } } });
    await db.staffInvite.deleteMany({ where: { orgId } });
    await db.guardianInvite.deleteMany({ where: { orgId } });
    await db.staff.deleteMany({ where: { orgId } });
    await db.vehicle.deleteMany({ where: { orgId } });
    await db.organization.delete({ where: { id: orgId } });
  }

  // ─── 데모 Auth user 정리 (@shuttlee*.local 도메인만) ───
  // raw SQL로 직접 삭제. CASCADE로 sessions·identities도 같이 정리됨.
  const { rowsDeleted } = await deleteDemoAuthUsers();
  console.log(`  ↺ Cleaned up ${rowsDeleted} demo auth users`);

  // ─── 새 demo data ───
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

  // OWNER — 이메일 가입 (demo OWNER, 실 사용자와 별개)
  const ownerUser = await createDemoAuthUser(DEMO_OWNER_EMAIL);
  const owner = await db.staff.create({
    data: {
      orgId: org.id,
      userId: ownerUser.id,
      name: "데모 학원장",
      phone: "010-1000-0001",
      role: "OWNER",
    },
  });

  // DRIVER — loginId 가입 (placeholder 이메일)
  const driverUser = await createDemoAuthUser(loginIdEmail("demo_driver"));
  const driver = await db.staff.create({
    data: {
      orgId: org.id,
      userId: driverUser.id,
      loginId: "demo_driver",
      name: "데모 기사",
      phone: "010-1000-0002",
      role: "DRIVER",
    },
  });

  // HELPER — loginId 가입
  const helperUser = await createDemoAuthUser(loginIdEmail("demo_helper"));
  const helper = await db.staff.create({
    data: {
      orgId: org.id,
      userId: helperUser.id,
      loginId: "demo_helper",
      name: "데모 동승자",
      phone: "010-1000-0003",
      role: "HELPER",
    },
  });
  console.log(`  ✓ Staff: ${owner.name}, ${driver.name}, ${helper.name}`);

  // 정류장 4개 — 대구 북구 산격동 → 침산동 (PARK 데모 동선)
  // 좌표는 도로명주소 기반 근사값 (오차 ~100~300m). 정밀 보정은 학원장
  // 화면 → 정류장 편집 카카오 지도 picker로 드래그.
  // radiusM=150으로 GPS 흔들림에도 STOP_PASS 자동 판정이 잡히게.
  // address는 W18-도입 컬럼. 운영 시 stop-map-picker가 카카오 reverse
  // geocoding으로 자동 채우는데 시드는 직접 명시 (실제 도로명/지번).
  const stops = await Promise.all(
    [
      {
        name: "산격대우아파트 (데모·출발)",
        lat: 35.8927,
        lng: 128.6088,
        address: "대구 북구 동북로 163",
      },
      {
        name: "산격네거리 (데모)",
        lat: 35.89,
        lng: 128.601,
        address: "대구 북구 산격동 산격네거리 부근",
      },
      {
        name: "침산네거리 (데모)",
        lat: 35.887,
        lng: 128.594,
        address: "대구 북구 침산동 침산네거리 부근",
      },
      {
        name: "침산남로 140 학원 (데모·도착)",
        lat: 35.8825,
        lng: 128.588,
        address: "대구 북구 침산남로 140",
      },
    ].map((s) =>
      db.stop.create({
        data: {
          orgId: org.id,
          name: s.name,
          lat: s.lat,
          lng: s.lng,
          address: s.address,
          radiusM: 150,
        },
      }),
    ),
  );
  console.log(`  ✓ Stops: ${stops.length}`);

  // 노선 2개 (등원/하원) — 둘 다 KIDS 차량에 (안전점검 데모를 위해)
  // 매일 (월~일 = 1+2+4+8+16+32+64 = 127): 어떤 요일에 데모해도 운행 노출
  const pickupRoute = await db.route.create({
    data: {
      vehicleId: kidsVehicle.id,
      name: "매일 등원 (데모)",
      direction: "PICKUP",
      weekdays: 127,
    },
  });
  const dropoffRoute = await db.route.create({
    data: {
      vehicleId: kidsVehicle.id,
      name: "매일 하원 (데모)",
      direction: "DROPOFF",
      weekdays: 127,
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
  // 보호자는 각자 demo loginId로 Auth user 생성
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
    students.map(async (s, i) => {
      const loginId = `demo_parent${i + 1}`;
      const user = await createDemoAuthUser(loginIdEmail(loginId));
      return db.guardian.create({
        data: {
          userId: user.id,
          loginId,
          name: `${s.name}의 보호자`,
          phone: `010-2000-000${i + 1}`,
        },
      });
    }),
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
    `  ✓ Students: ${students.length}, Guardians: ${guardians.length} (with Auth users)`,
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

  // 결석 신청 1건 — 학원장이 "기사에 전달" 처리한 상태 (NOTIFIED_DRIVER).
  // driver 운행 화면에 학생이 "결석 (전달됨)" 뱃지로 표시되어 메뉴얼 캡처용.
  // 학생 4 (= 데모 학생 4)가 오늘 등하원 모두 결석.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  await db.absenceRequest.create({
    data: {
      studentId: students[3]!.id,
      createdBy: guardians[3]!.id,
      date: today,
      type: "ABSENT_BOTH",
      reason: "병원 진료",
      status: "NOTIFIED_DRIVER",
    },
  });
  console.log(`  ✓ AbsenceRequest: 1 (학생 4, NOTIFIED_DRIVER)`);

  console.log("\n✅ Seed complete.\n");
  console.log("📋 Demo accounts (모두 비번 demo1234!):");
  console.log(`  - OWNER:    ${DEMO_OWNER_EMAIL}`);
  console.log(`  - DRIVER:   loginId=demo_driver`);
  console.log(`  - HELPER:   loginId=demo_helper`);
  console.log(`  - GUARDIAN: loginId=demo_parent1 ~ demo_parent5`);
  console.log("");
}

// ─── helpers ───

async function createDemoAuthUser(email: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(
      `[seed] createUser failed for ${email}: ${error?.message ?? "unknown"}`,
    );
  }
  return data.user;
}

async function deleteDemoAuthUsers(): Promise<{ rowsDeleted: number }> {
  // Supabase admin API는 list + delete 패턴. listUsers는 페이지네이션.
  let deleted = 0;
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error(`[seed] listUsers failed: ${error.message}`);
      break;
    }
    const candidates = data.users.filter((u) =>
      /@shuttlee(-demo)?\.local$/.test(u.email ?? ""),
    );
    for (const u of candidates) {
      const { error: delErr } = await admin.auth.admin.deleteUser(u.id);
      if (!delErr) deleted++;
    }
    if (data.users.length < perPage) break;
    page++;
  }
  return { rowsDeleted: deleted };
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
