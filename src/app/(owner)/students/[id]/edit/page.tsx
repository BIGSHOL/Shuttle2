import { notFound } from "next/navigation";

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
import { studentTerm } from "@/lib/i18n/org-terms";

import { updateStudentAction } from "../../actions";
import { StudentForm } from "../../_components/student-form";
import { RouteStudentsSection } from "./route-students-section";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireOwner();
  const orgId = await getOrgId();
  const term = studentTerm(user.org.type);

  const student = await db.student.findFirst({
    where: { id, orgId },
    include: {
      routes: {
        include: {
          route: { select: { id: true, name: true, direction: true } },
          stop: { select: { id: true, name: true } },
        },
      },
      guardians: {
        include: {
          guardian: {
            select: { id: true, name: true, phone: true, userId: true },
          },
        },
        orderBy: { isPrimary: "desc" },
      },
    },
  });

  if (!student) {
    notFound();
  }

  const [routes, stops] = await Promise.all([
    db.route.findMany({
      // W26-B: 미사용 노선은 신규 배정 picker에서 제외
      where: { vehicle: { orgId }, isActive: true },
      orderBy: [{ direction: "asc" }, { name: "asc" }],
      select: { id: true, name: true, direction: true },
    }),
    db.stop.findMany({
      // W26-E: 미사용 정류장은 신규 배정 picker에서 제외
      where: { orgId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const boundUpdate = updateStudentAction.bind(null, id);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold">
          {term} 편집 — {student.name}
        </h2>
        <p className="text-muted-foreground text-sm">
          기본 정보를 수정하거나 노선·정류장 배정을 추가·해제하세요.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
          <CardDescription>저장하면 즉시 반영됩니다.</CardDescription>
        </CardHeader>
        <StudentForm
          action={boundUpdate}
          initial={{ name: student.name, birthYear: student.birthYear }}
          termLabel={term}
          title=""
          submitLabel="기본 정보 저장"
          showCard={false}
        />
      </Card>

      <RouteStudentsSection
        studentId={id}
        rows={student.routes.map((rs) => ({
          id: rs.id,
          route: rs.route,
          stop: rs.stop,
        }))}
        routes={routes}
        stops={stops}
      />

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>연결된 보호자</CardTitle>
              <CardDescription>
                보호자 추가·해제는 보호자 화면에서 관리합니다.
              </CardDescription>
            </div>
            <Link
              href="/guardians"
              className="text-primary text-sm hover:underline"
            >
              보호자 화면으로 →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {student.guardians.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">
              아직 연결된 보호자가 없어요. 보호자 화면에서 새 초대를 보내세요.
            </p>
          ) : (
            <ul className="divide-y text-sm">
              {student.guardians.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between gap-3 px-4 py-2"
                >
                  <div>
                    <span className="font-medium">{g.guardian.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      ({g.relation}
                      {g.isPrimary ? " · 주" : ""}) · {g.guardian.phone}
                    </span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {g.guardian.userId ? "가입 완료" : "미가입"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
