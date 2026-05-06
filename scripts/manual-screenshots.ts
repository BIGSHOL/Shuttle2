/**
 * docs/manual의 스크린샷을 Playwright로 자동 촬영.
 *
 * 실행 전 확인:
 *   1. dev server 띄움 (`pnpm dev`, 3000 포트)
 *   2. demo seed 됐음 (`pnpm db:seed`)
 *
 * 실행:
 *   pnpm tsx scripts/manual-screenshots.ts owner
 *   pnpm tsx scripts/manual-screenshots.ts driver
 *   pnpm tsx scripts/manual-screenshots.ts guardian
 *   pnpm tsx scripts/manual-screenshots.ts all
 *
 * 스크린샷 저장 위치: docs/manual/screenshots/{role}/NN-{name}.png
 */
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:3000";
const SS_DIR = "docs/manual/screenshots";
const PASS = "demo1234!";

// Demo accounts (seed.ts 기준)
const ACCOUNTS = {
  owner: { id: "demo-owner@shuttlee-demo.local", label: "OWNER" },
  driver: { id: "demo_driver", label: "DRIVER" },
  guardian: { id: "demo_parent1", label: "GUARDIAN" },
} as const;

type Role = keyof typeof ACCOUNTS;

// ────────────────────────────────────────────────────────────────────
// 헬퍼
// ────────────────────────────────────────────────────────────────────

async function login(page: Page, role: Role) {
  const acc = ACCOUNTS[role];
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[name="identifier"]', acc.id);
  await page.fill('input[name="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle");
}

async function shoot(page: Page, role: Role, name: string, opts: ShootOptions = {}) {
  const path = join(SS_DIR, role, `${name}.png`);
  if (opts.scrollTo) {
    await page.evaluate((y) => window.scrollTo(0, y as number), opts.scrollTo);
  }
  if (opts.wait) await page.waitForTimeout(opts.wait);
  if (opts.fullPage !== false) await page.waitForLoadState("networkidle");
  await page.screenshot({
    path,
    fullPage: opts.fullPage ?? false,
    clip: opts.clip,
  });
  console.log(`  📸 ${path}`);
}

type ShootOptions = {
  fullPage?: boolean;
  wait?: number;
  scrollTo?: number;
  clip?: { x: number; y: number; width: number; height: number };
};

async function navigate(page: Page, path: string, opts: { wait?: number } = {}) {
  await page.goto(`${BASE}${path}`);
  await page.waitForLoadState("networkidle");
  if (opts.wait) await page.waitForTimeout(opts.wait);
}

// 페이지 안의 모든 link href를 훑어 첫 번째 매칭 ID 반환.
// prefix("/vehicles/") → href가 "/vehicles/abc" 또는 "/vehicles/abc/edit" 인 것.
// exclude: ["invite", "new"]면 "/vehicles/invite" 같은 link 무시.
async function firstIdMatch(
  page: Page,
  prefix: string,
  opts: { exclude?: string[] } = {},
): Promise<string | null> {
  const exclude = opts.exclude ?? ["new", "invite"];
  const hrefs = await page.locator(`a[href^="${prefix}"]`).evaluateAll((els) =>
    (els as HTMLAnchorElement[]).map((a) => a.getAttribute("href")),
  );
  for (const href of hrefs) {
    if (!href) continue;
    const segments = href.split("/").filter(Boolean);
    // prefix "/vehicles/" → segments = ["vehicles", "<id>", ...]
    const id = segments[1];
    if (!id) continue;
    if (exclude.includes(id)) continue;
    return id;
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────
// OWNER 시나리오 — 30+ 스크린샷
// ────────────────────────────────────────────────────────────────────

async function runOwner(browser: Browser) {
  console.log(`\n🏫 OWNER 메뉴얼 스크린샷 시작`);
  mkdirSync(join(SS_DIR, "owner"), { recursive: true });

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();

  // 1. Login (가입 화면도 같이 — 가입은 OWNER만이라 여기서)
  await navigate(page, "/signup");
  await shoot(page, "owner", "01-signup");

  await navigate(page, "/login");
  await shoot(page, "owner", "02-login");

  // 2. 로그인 후 dashboard
  await login(page, "owner");
  await page.waitForTimeout(1500);
  await shoot(page, "owner", "03-dashboard-overview");
  await shoot(page, "owner", "04-dashboard-multi-trip-map", {
    clip: { x: 0, y: 0, width: 1440, height: 400 },
  });

  // 3. 차량
  await navigate(page, "/vehicles/new");
  await shoot(page, "owner", "05-vehicle-new");

  await navigate(page, "/vehicles");
  await shoot(page, "owner", "06-vehicles-list");

  // 차량 360° — 첫 번째 차량 (list에서 row link)
  const firstVehicleId = await firstIdMatch(page, "/vehicles/");
  if (firstVehicleId) {
    await navigate(page, `/vehicles/${firstVehicleId}`);
    await shoot(page, "owner", "07-vehicle-detail");
  }

  // 4. 정류장
  await navigate(page, "/stops/new", { wait: 2000 }); // 카카오맵 로드
  await shoot(page, "owner", "08-stop-new");

  await navigate(page, "/stops");
  await shoot(page, "owner", "09-stops-list");

  const firstStopId = await firstIdMatch(page, "/stops/");
  if (firstStopId) {
    await navigate(page, `/stops/${firstStopId}`, { wait: 2000 });
    await shoot(page, "owner", "10-stop-detail");
  }

  // 5. 노선
  await navigate(page, "/routes/new");
  await shoot(page, "owner", "11-route-new");

  // route edit — 첫 번째 노선
  await navigate(page, "/routes");
  const firstRouteId = await firstIdMatch(page, "/routes/");
  if (firstRouteId) {
    await navigate(page, `/routes/${firstRouteId}/edit`);
    await shoot(page, "owner", "12-route-stops");
  }

  // 6. 학생
  await navigate(page, "/students/new");
  await shoot(page, "owner", "13-student-new");

  await navigate(page, "/students");
  await shoot(page, "owner", "14-students-list");

  const firstStudentId = await firstIdMatch(page, "/students/");
  if (firstStudentId) {
    await navigate(page, `/students/${firstStudentId}`);
    await shoot(page, "owner", "15-student-detail");

    await navigate(page, `/students/${firstStudentId}/edit`);
    await shoot(page, "owner", "16-student-route-assign");
  }

  // 7. 직원
  await navigate(page, "/staff/invite");
  await shoot(page, "owner", "17-staff-invite");

  await navigate(page, "/staff");
  await shoot(page, "owner", "18-staff-list");

  const firstStaffId = await firstIdMatch(page, "/staff/", { exclude: ["invite"] });
  if (firstStaffId) {
    await navigate(page, `/staff/${firstStaffId}`);
    await shoot(page, "owner", "19-staff-detail");
  }

  // 8. 학부모
  await navigate(page, "/guardians/invite");
  await shoot(page, "owner", "20-guardian-invite");

  await navigate(page, "/guardians");
  await shoot(page, "owner", "21-guardians-list");

  const firstGuardianId = await firstIdMatch(page, "/guardians/", { exclude: ["invite"] });
  if (firstGuardianId) {
    await navigate(page, `/guardians/${firstGuardianId}`);
    await shoot(page, "owner", "22-guardian-detail");
  }

  // 9. 결석/정류장 변경
  await navigate(page, "/absences");
  await shoot(page, "owner", "23-absences");

  await navigate(page, "/stop-change-requests");
  await shoot(page, "owner", "24-stop-change-requests");

  // 10. 운행 모니터링·분석
  await navigate(page, "/dashboard");
  await page.waitForTimeout(1500);
  await shoot(page, "owner", "25-trip-monitor", {
    scrollTo: 600,
  });

  await navigate(page, "/dashboard/analytics");
  await shoot(page, "owner", "28-analytics");

  // 11. 안전운행기록·교육
  await navigate(page, "/safety-report");
  await shoot(page, "owner", "31-safety-report");

  await navigate(page, "/training");
  await shoot(page, "owner", "32-training");

  await navigate(page, "/training/new");
  await shoot(page, "owner", "33-training-new");

  // 12. 알림
  await navigate(page, "/dashboard/notifications");
  await shoot(page, "owner", "34-notifications");

  await ctx.close();
  console.log(`✅ OWNER 끝`);
}

// ────────────────────────────────────────────────────────────────────
// DRIVER 시나리오 — 18+ 스크린샷
// ────────────────────────────────────────────────────────────────────

async function runDriver(browser: Browser) {
  console.log(`\n🚌 DRIVER 메뉴얼 스크린샷 시작`);
  mkdirSync(join(SS_DIR, "driver"), { recursive: true });

  const ctx = await browser.newContext({
    viewport: { width: 414, height: 896 }, // iPhone 11 Pro Max
    isMobile: true,
    deviceScaleFactor: 2,
    permissions: ["geolocation"],
    geolocation: { latitude: 37.4979, longitude: 127.0276 }, // 강남역
  });
  const page = await ctx.newPage();

  // 1. 가입·로그인 (토큰 가입은 토큰 필요 — login만 촬영)
  await navigate(page, "/login");
  await shoot(page, "driver", "02-login");

  // 2. /run 첫 진입
  await login(page, "driver");
  await page.waitForTimeout(1000);
  await shoot(page, "driver", "03-run-overview");

  // 3. 알림 list
  await navigate(page, "/run/notifications");
  await shoot(page, "driver", "17-notifications");

  // TODO: 운행 시작 후 화면들은 trip 시작 server action 별도 필요
  // 일단 정적 화면만 촬영. 동적 화면은 user에 안내.

  await ctx.close();
  console.log(`✅ DRIVER 끝 (운행 화면은 별도 처리)`);
}

// ────────────────────────────────────────────────────────────────────
// GUARDIAN 시나리오 — 25 스크린샷
// ────────────────────────────────────────────────────────────────────

async function runGuardian(browser: Browser) {
  console.log(`\n👨‍👩‍👧 GUARDIAN 메뉴얼 스크린샷 시작`);
  mkdirSync(join(SS_DIR, "guardian"), { recursive: true });

  const ctx = await browser.newContext({
    viewport: { width: 414, height: 896 },
    isMobile: true,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  await navigate(page, "/login");
  await shoot(page, "guardian", "02-login");

  await login(page, "guardian");
  await page.waitForTimeout(1500);
  await shoot(page, "guardian", "03-home-overview");

  await navigate(page, "/notifications");
  await shoot(page, "guardian", "19-notifications");

  await navigate(page, "/my-absences/new");
  await shoot(page, "guardian", "21-absence-new");

  await navigate(page, "/my-absences");
  await shoot(page, "guardian", "22-absences-history");

  await navigate(page, "/my-stop-changes/new", { wait: 2000 });
  await shoot(page, "guardian", "23-stop-change-new");

  await navigate(page, "/my-stop-changes");
  await shoot(page, "guardian", "24-stop-changes-history");

  // BottomTabBar — 홈에서 클립으로
  await navigate(page, "/home");
  await page.waitForTimeout(1500);
  await shoot(page, "guardian", "26-bottom-tabs", {
    clip: { x: 0, y: 800, width: 414, height: 96 },
  });

  await ctx.close();
  console.log(`✅ GUARDIAN 끝 (trip-live 풀스크린은 별도 처리)`);
}

// ────────────────────────────────────────────────────────────────────
// 메인
// ────────────────────────────────────────────────────────────────────

async function main() {
  const arg = process.argv[2] ?? "all";
  const browser = await chromium.launch({ headless: true });

  try {
    if (arg === "owner" || arg === "all") await runOwner(browser);
    if (arg === "driver" || arg === "all") await runDriver(browser);
    if (arg === "guardian" || arg === "all") await runGuardian(browser);
  } finally {
    await browser.close();
  }

  console.log("\n🎬 스크린샷 끝");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
