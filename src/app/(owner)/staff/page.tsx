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

import { DeleteStaffButton } from "./_components/delete-staff-button";
import { RevokeInviteButton } from "./_components/revoke-invite-button";

const ROLE_LABEL = {
  OWNER: "학원장·원장",
  DRIVER: "기사",
  HELPER: "동승보호자",
} as const;

const ROLE_BADGE: Record<keyof typeof ROLE_LABEL, string> = {
  OWNER:
    "rounded-md bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900",
  DRIVER:
    "rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900",
  HELPER: "rounded-md bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900",
};

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function StaffPage() {
  const me = await requireOwner();
  const orgId = await getOrgId();

  const [staffs, invites] = await Promise.all([
    db.staff.findMany({
      where: { orgId },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    db.staffInvite.findMany({
      where: { orgId, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">직원</h2>
          <p className="text-muted-foreground text-sm">
            학원장·원장 본인과 기사·동승보호자를 관리합니다. 새 기사·동승자는
            초대 링크를 발급해 가입하게 합니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/staff/invite">+ 새 초대</Link>
        </Button>
      </div>

      {/* 등록된 직원 */}
      <Card>
        <CardHeader>
          <CardTitle>등록된 직원</CardTitle>
          <CardDescription>본인 + 가입을 마친 기사·동승자.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead className="w-32">역할</TableHead>
                <TableHead className="w-40">전화</TableHead>
                <TableHead className="w-24">상태</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffs.map((s) => {
                const isMe = s.id === me.staff.id;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {s.name}
                      {isMe ? (
                        <span className="text-muted-foreground ml-2 text-xs">
                          (나)
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <span className={ROLE_BADGE[s.role]}>
                        {ROLE_LABEL[s.role]}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {s.phone || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {s.userId ? "가입 완료" : "미가입"}
                    </TableCell>
                    <TableCell className="text-right">
                      {!isMe && s.role !== "OWNER" ? (
                        <DeleteStaffButton
                          id={s.id}
                          name={s.name}
                          roleLabel={ROLE_LABEL[s.role]}
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 미사용 초대 */}
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
                  <TableHead className="w-32">역할</TableHead>
                  <TableHead className="w-40">전화</TableHead>
                  <TableHead className="w-32">만료일</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell>
                      <span className={ROLE_BADGE[i.role]}>
                        {ROLE_LABEL[i.role]}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {i.phone}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatDate(i.expiresAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <RevokeInviteButton id={i.id} />
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
