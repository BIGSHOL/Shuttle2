import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";

import { ResetGuardianPasswordButton } from "./_components/reset-guardian-password-button";
import { RevokeGuardianInviteButton } from "./_components/revoke-guardian-invite-button";
import { UnlinkGuardianLinkButton } from "./_components/unlink-guardian-link-button";

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function GuardiansPage() {
  await requireOwner();
  const orgId = await getOrgId();

  // 본 기관 학생 → 그 학생의 GuardianLink → 가입된 Guardian만 모음 (orgId 없는 모델 보호 위해 학생 통해 join)
  const links = await db.guardianLink.findMany({
    where: { student: { orgId } },
    include: {
      guardian: {
        select: {
          id: true,
          name: true,
          phone: true,
          loginId: true,
          userId: true,
        },
      },
      student: { select: { id: true, name: true } },
    },
    orderBy: [{ guardian: { name: "asc" } }],
  });

  // Guardian별로 자녀들 묶기
  type GuardianRow = {
    id: string;
    name: string;
    phone: string;
    loginId: string | null;
    userId: string | null;
    children: {
      id: string;
      name: string;
      relation: string;
      isPrimary: boolean;
      linkId: string;
    }[];
  };
  const byGuardian = new Map<string, GuardianRow>();
  for (const l of links) {
    const cur = byGuardian.get(l.guardian.id);
    const child = {
      id: l.student.id,
      name: l.student.name,
      relation: l.relation,
      isPrimary: l.isPrimary,
      linkId: l.id,
    };
    if (cur) {
      cur.children.push(child);
    } else {
      byGuardian.set(l.guardian.id, {
        id: l.guardian.id,
        name: l.guardian.name,
        phone: l.guardian.phone,
        loginId: l.guardian.loginId,
        userId: l.guardian.userId,
        children: [child],
      });
    }
  }
  const guardians = Array.from(byGuardian.values());

  // 미사용 초대
  const invites = await db.guardianInvite.findMany({
    where: { orgId, acceptedAt: null, expiresAt: { gt: new Date() } },
    include: {
      students: {
        include: { student: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">보호자</h2>
          <p className="text-muted-foreground text-sm">
            학부모·보호자를 자녀와 연결합니다. 새 보호자는 초대 링크로 가입.
          </p>
        </div>
        <Button asChild>
          <Link href="/guardians/invite">+ 새 초대</Link>
        </Button>
      </div>

      {/* 등록된 보호자 */}
      <Card>
        <CardHeader>
          <CardTitle>등록된 보호자</CardTitle>
          <CardDescription>
            본 기관 학생과 연결된 보호자. 한 보호자가 여러 자녀를 가질 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {guardians.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">
              아직 등록된 보호자가 없습니다.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead className="w-32">로그인 아이디</TableHead>
                  <TableHead className="w-40">전화</TableHead>
                  <TableHead>자녀</TableHead>
                  <TableHead className="w-24">상태</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guardians.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {g.loginId ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {g.phone}
                    </TableCell>
                    <TableCell className="text-sm">
                      <ul className="space-y-0.5">
                        {g.children.map((c) => (
                          <li
                            key={c.linkId}
                            className="flex items-center gap-2"
                          >
                            <span>{c.name}</span>
                            <span className="text-muted-foreground text-xs">
                              ({c.relation}
                              {c.isPrimary ? " · 주" : ""})
                            </span>
                            <UnlinkGuardianLinkButton
                              linkId={c.linkId}
                              guardianName={g.name}
                              studentName={c.name}
                            />
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {g.userId ? "가입 완료" : "미가입"}
                    </TableCell>
                    <TableCell className="text-right">
                      {g.userId && g.loginId ? (
                        <ResetGuardianPasswordButton
                          guardianId={g.id}
                          name={g.name}
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 대기 중 초대 */}
      <Card>
        <CardHeader>
          <CardTitle>대기 중인 초대</CardTitle>
          <CardDescription>
            발급된 후 아직 가입되지 않은 초대 링크. 7일 안에 사용해야 합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {invites.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">
              대기 중인 초대가 없습니다.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead className="w-32">로그인 아이디</TableHead>
                  <TableHead className="w-32">관계</TableHead>
                  <TableHead className="w-40">전화</TableHead>
                  <TableHead>자녀</TableHead>
                  <TableHead className="w-32">만료일</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {i.loginId ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {i.relation}
                      {i.isPrimary ? " · 주" : ""}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {i.phone}
                    </TableCell>
                    <TableCell className="text-sm">
                      {i.students.map((s) => s.student.name).join(", ")}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatDate(i.expiresAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <RevokeGuardianInviteButton id={i.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
