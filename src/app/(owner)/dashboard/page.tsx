import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";
import { env } from "@/lib/env";

import { StaffNotificationToggle } from "../notifications/staff-notification-toggle";

const ORG_TYPE_LABEL: Record<"ACADEMY" | "DAYCARE" | "KINDERGARTEN", string> = {
  ACADEMY: "학원·교습소",
  DAYCARE: "어린이집",
  KINDERGARTEN: "유치원",
};

const PLAN_LABEL = {
  TRIAL: "체험판",
  BASIC: "기본",
  PRO: "프로",
} as const;

export default async function DashboardPage() {
  const user = await requireOwner();
  const orgId = await getOrgId();

  // 멀티테넌시 1차 가드 — 모든 count는 반드시 orgId로 필터.
  const [vehicleCount, studentCount, stopCount, routeCount] = await Promise.all(
    [
      db.vehicle.count({ where: { orgId } }),
      db.student.count({ where: { orgId } }),
      db.stop.count({ where: { orgId } }),
      db.route.count({ where: { vehicle: { orgId } } }),
    ],
  );

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { plan: true, createdAt: true },
  });

  // 보험 만료 D-30 alert (KIDS 모드 차량 한정 — KIDS 의무).
  // insuranceUntil이 오늘 + 30일 이내거나 이미 지났으면 alert.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const d30 = new Date(today);
  d30.setUTCDate(d30.getUTCDate() + 30);
  const expiringVehicles = await db.vehicle.findMany({
    where: {
      orgId,
      mode: "KIDS",
      OR: [
        { insuranceUntil: null },
        { insuranceUntil: { lte: d30 } },
      ],
    },
    orderBy: [{ insuranceUntil: "asc" }],
    select: { id: true, plate: true, insuranceUntil: true },
  });

  // 안전교육 D-30 alert. 직원별 가장 최근 record를 보고 만료 30일 이내거나
  // 만료된/기록 없는 staff를 모음.
  const staffWithTraining = await db.staff.findMany({
    where: { orgId },
    select: {
      id: true,
      name: true,
      role: true,
      trainings: {
        orderBy: { completedOn: "desc" },
        take: 1,
        select: { expiresOn: true },
      },
    },
  });
  const trainingAlerts = staffWithTraining
    .map((s) => {
      const latest = s.trainings[0];
      if (!latest) return { ...s, kind: "none" as const };
      if (latest.expiresOn < today)
        return { ...s, kind: "expired" as const, expiresOn: latest.expiresOn };
      if (latest.expiresOn <= d30)
        return { ...s, kind: "soon" as const, expiresOn: latest.expiresOn };
      return null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <section className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{user.org.name}</h2>
          <p className="text-muted-foreground text-sm">
            {ORG_TYPE_LABEL[user.org.type]} · 요금제{" "}
            {org ? PLAN_LABEL[org.plan] : "-"}
          </p>
        </div>
        {env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? (
          <StaffNotificationToggle
            vapidPublicKey={env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}
          />
        ) : null}
      </section>

      {trainingAlerts.length > 0 ? (
        <section className="space-y-2">
          <Card className="border-amber-300 bg-amber-50/60">
            <CardHeader>
              <CardTitle className="text-amber-900">
                ⚠️ 안전교육 만료 임박·미입력 직원 ({trainingAlerts.length})
              </CardTitle>
              <CardDescription>
                도교법상 운영자·기사·동승보호자는 2년마다 안전교육 이수
                의무가 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y text-sm">
                {trainingAlerts.map((s) => {
                  const tone =
                    s.kind === "expired"
                      ? "bg-rose-100 text-rose-900"
                      : s.kind === "soon"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-zinc-100 text-zinc-700";
                  const label =
                    s.kind === "expired"
                      ? `만료됨 (${s.expiresOn.toISOString().slice(0, 10)})`
                      : s.kind === "soon"
                        ? `30일 이내 만료 (${s.expiresOn.toISOString().slice(0, 10)})`
                        : "기록 없음";
                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-3 px-4 py-2"
                    >
                      <Link
                        href="/training"
                        className="hover:underline"
                      >
                        <span className="font-medium">{s.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {s.role === "OWNER"
                            ? "학원장·원장"
                            : s.role === "DRIVER"
                              ? "기사"
                              : "동승보호자"}
                        </span>
                      </Link>
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${tone}`}
                      >
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {expiringVehicles.length > 0 ? (
        <section className="space-y-2">
          <Card className="border-amber-300 bg-amber-50/60">
            <CardHeader>
              <CardTitle className="text-amber-900">
                ⚠️ 보험 만료 임박·미입력 차량 ({expiringVehicles.length})
              </CardTitle>
              <CardDescription>
                어린이통학버스(KIDS) 보험은 도교법상 필수입니다. 만료 30일
                전부터 갱신을 진행하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y text-sm">
                {expiringVehicles.map((v) => {
                  const expired =
                    v.insuranceUntil && v.insuranceUntil < today;
                  const dateLabel = v.insuranceUntil
                    ? v.insuranceUntil.toISOString().slice(0, 10)
                    : "미입력";
                  const tone = expired
                    ? "bg-rose-100 text-rose-900"
                    : v.insuranceUntil
                      ? "bg-amber-100 text-amber-900"
                      : "bg-zinc-100 text-zinc-700";
                  return (
                    <li
                      key={v.id}
                      className="flex items-center justify-between gap-3 px-4 py-2"
                    >
                      <Link
                        href={`/vehicles/${v.id}/edit`}
                        className="hover:underline"
                      >
                        <span className="font-medium">{v.plate}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          만료 {dateLabel}
                        </span>
                      </Link>
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${tone}`}
                      >
                        {expired
                          ? "만료됨"
                          : v.insuranceUntil
                            ? "30일 이내 만료"
                            : "미입력"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/vehicles" className="block">
          <Card className="hover:border-primary transition-colors">
            <CardHeader>
              <CardDescription>등록된 차량</CardDescription>
              <CardTitle className="text-3xl">{vehicleCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">
                KIDS / GENERAL · 클릭해서 관리
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/stops" className="block">
          <Card className="hover:border-primary transition-colors">
            <CardHeader>
              <CardDescription>등록된 정류장</CardDescription>
              <CardTitle className="text-3xl">{stopCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">
                카카오맵 좌표 · 클릭해서 관리
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/routes" className="block">
          <Card className="hover:border-primary transition-colors">
            <CardHeader>
              <CardDescription>등록된 노선</CardDescription>
              <CardTitle className="text-3xl">{routeCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">
                등원·하원 · 클릭해서 관리
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/students" className="block">
          <Card className="hover:border-primary transition-colors">
            <CardHeader>
              <CardDescription>
                등록된 {user.org.type === "ACADEMY" ? "학생" : "원아"}
              </CardDescription>
              <CardTitle className="text-3xl">{studentCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">
                노선·정류장 배정 · 클릭해서 관리
              </p>
            </CardContent>
          </Card>
        </Link>
      </section>

      <section className="bg-background rounded-lg border p-6">
        <h3 className="text-base font-semibold">다음 단계</h3>
        <ul className="text-muted-foreground mt-2 space-y-1 text-sm">
          <li>• W2: 차량·노선·정류장 등록 UI + 카카오맵 통합</li>
          <li>• W3: 기사·동승자 초대, 운행 시작·종료 흐름</li>
          <li>• W4: 학부모 가입·자녀 연결, 실시간 위치 지도</li>
        </ul>
      </section>
    </main>
  );
}
