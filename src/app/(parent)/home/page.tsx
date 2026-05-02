import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireGuardian } from "@/lib/auth/session";
import { ORG_TYPE_LABEL } from "@/lib/i18n/org-terms";

export default async function ParentHomePage() {
  const me = await requireGuardian();

  // 자녀별 소속 학원 + 노선 배정 수를 한 번에 가져옴.
  const studentIds = me.students.map((s) => s.id);
  const studentRows = await db.student.findMany({
    where: { id: { in: studentIds } },
    select: {
      id: true,
      name: true,
      birthYear: true,
      org: { select: { id: true, name: true, type: true } },
      _count: { select: { routes: true } },
    },
  });

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <section>
        <h2 className="text-xl font-semibold">
          {me.guardian.name}님, 안녕하세요
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          연결된 자녀 {studentRows.length}명의 셔틀 운행을 확인할 수 있어요.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">자녀 목록</h3>
        {studentRows.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                연결된 자녀가 아직 없어요
              </CardTitle>
              <CardDescription>
                학원장·원장님께 보호자 초대를 다시 요청해 주세요.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {studentRows.map((s) => (
              <Card key={s.id}>
                <CardHeader>
                  <CardTitle className="text-base">{s.name}</CardTitle>
                  <CardDescription>
                    {s.org.name} · {ORG_TYPE_LABEL[s.org.type]}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  배정 노선 {s._count.routes}개 · {s.birthYear}년생
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">내일 운행</h3>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              실시간 셔틀 위치는 곧 공개돼요
            </CardTitle>
            <CardDescription>
              자녀의 등·하원 노선과 셔틀 실시간 위치를 카카오맵 위에서 볼 수
              있는 기능을 준비 중이에요. (W4-2)
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">결석 신청</h3>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">결석 신청은 곧 열려요</CardTitle>
            <CardDescription>
              결석 사유와 날짜를 보낼 수 있는 기능을 준비 중이에요. (W4-3)
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    </main>
  );
}
