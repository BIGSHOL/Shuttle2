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
  const [vehicleCount, studentCount, stopCount] = await Promise.all([
    db.vehicle.count({ where: { orgId } }),
    db.student.count({ where: { orgId } }),
    db.stop.count({ where: { orgId } }),
  ]);

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { plan: true, createdAt: true },
  });

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <section>
        <h2 className="text-2xl font-semibold">{user.org.name}</h2>
        <p className="text-muted-foreground text-sm">
          {ORG_TYPE_LABEL[user.org.type]} · 요금제{" "}
          {org ? PLAN_LABEL[org.plan] : "-"}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Link href="/vehicles" className="block">
          <Card className="hover:border-primary transition-colors">
            <CardHeader>
              <CardDescription>등록된 차량</CardDescription>
              <CardTitle className="text-3xl">{vehicleCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">
                KIDS / GENERAL 모드 합계 · 클릭해서 관리
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader>
            <CardDescription>등록된 학생·원아</CardDescription>
            <CardTitle className="text-3xl">{studentCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs">
              본 기관 소속만 (다른 기관 데이터는 보이지 않음)
            </p>
          </CardContent>
        </Card>

        <Link href="/stops" className="block">
          <Card className="hover:border-primary transition-colors">
            <CardHeader>
              <CardDescription>등록된 정류장</CardDescription>
              <CardTitle className="text-3xl">{stopCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">
                카카오맵 좌표 기반 · 클릭해서 관리
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
