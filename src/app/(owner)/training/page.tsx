import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";

import { CertificateViewButton } from "./_components/certificate-view-button";
import { DeleteTrainingButton } from "./_components/delete-training-button";

const CATEGORY_LABEL = {
  OPERATOR: "운영자",
  DRIVER: "기사",
  HELPER: "동승보호자",
} as const;

const ROLE_LABEL = {
  OWNER: "학원장·원장",
  DRIVER: "기사",
  HELPER: "동승보호자",
} as const;

export default async function TrainingPage() {
  await requireOwner();
  const orgId = await getOrgId();

  // 본 기관의 staff + 그들의 trainings (최신 순). staff 한 명 = N개 record.
  const staffs = await db.staff.findMany({
    where: { orgId },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: {
      trainings: {
        orderBy: { completedOn: "desc" },
        select: {
          id: true,
          category: true,
          completedOn: true,
          expiresOn: true,
          certificateUrl: true,
          certificateFile: true,
        },
      },
    },
  });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">안전교육 기록</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            법령상 운영자·기사·동승보호자는 2년마다 안전교육 이수 의무가
            있습니다. 이수증을 받으면 여기에 기록을 추가해 두세요.
          </p>
        </div>
        <Button asChild>
          <Link href="/training/new">+ 새 기록</Link>
        </Button>
      </div>

      {staffs.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">등록된 직원이 없어요</CardTitle>
            <CardDescription>
              직원 화면에서 기사·동승자를 먼저 초대해 주세요.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-3">
          {staffs.map((s) => {
            const latest = s.trainings[0];
            const expired = latest && latest.expiresOn < today;
            const empty = !latest;
            return (
              <Card
                key={s.id}
                className={
                  empty
                    ? ""
                    : expired
                      ? "border-destructive/30 bg-destructive/5"
                      : ""
                }
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{s.name}</CardTitle>
                      <CardDescription className="mt-1 text-xs">
                        {ROLE_LABEL[s.role]} · {s.phone}
                      </CardDescription>
                    </div>
                    {empty ? (
                      <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-bold">
                        기록 없음
                      </span>
                    ) : expired ? (
                      <span className="bg-destructive/10 text-destructive rounded-md px-2 py-0.5 text-xs font-bold">
                        만료됨
                      </span>
                    ) : (
                      <span className="bg-success-soft text-success rounded-md px-2 py-0.5 text-xs font-bold">
                        유효 ({latest.expiresOn.toISOString().slice(0, 10)})
                      </span>
                    )}
                  </div>
                </CardHeader>
                {s.trainings.length > 0 ? (
                  <CardContent className="p-0">
                    <ul className="divide-y text-sm">
                      {s.trainings.map((t) => (
                        <li
                          key={t.id}
                          className="flex items-center justify-between gap-3 px-4 py-2"
                        >
                          <div>
                            <span className="font-medium">
                              {CATEGORY_LABEL[t.category]}
                            </span>
                            <span className="text-muted-foreground ml-2 text-xs">
                              이수 {t.completedOn.toISOString().slice(0, 10)} ·
                              만료 {t.expiresOn.toISOString().slice(0, 10)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {t.certificateFile ? (
                              <CertificateViewButton recordId={t.id} />
                            ) : t.certificateUrl ? (
                              <a
                                href={t.certificateUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary text-xs hover:underline"
                              >
                                이수증 ↗
                              </a>
                            ) : null}
                            <DeleteTrainingButton id={t.id} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
