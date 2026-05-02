import { notFound } from "next/navigation";

import {
  Card,
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
    },
  });

  if (!student) {
    notFound();
  }

  const [routes, stops] = await Promise.all([
    db.route.findMany({
      where: { vehicle: { orgId } },
      orderBy: [{ direction: "asc" }, { name: "asc" }],
      select: { id: true, name: true, direction: true },
    }),
    db.stop.findMany({
      where: { orgId },
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
    </main>
  );
}
