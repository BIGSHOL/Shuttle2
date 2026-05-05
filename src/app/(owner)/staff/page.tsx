import Link from "next/link";
import { ChevronRight } from "lucide-react";

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

import { RevokeInviteButton } from "./_components/revoke-invite-button";

const ROLE_LABEL = {
  OWNER: "학원장·원장",
  DRIVER: "기사",
  HELPER: "동승보호자",
} as const;

const ROLE_BADGE: Record<keyof typeof ROLE_LABEL, string> = {
  OWNER:
    "bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs font-bold",
  DRIVER:
    "bg-success-soft text-success rounded-md px-2 py-0.5 text-xs font-bold",
  HELPER:
    "bg-info-soft text-info rounded-md px-2 py-0.5 text-xs font-bold",
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
            학원장·원장 본인과 기사·동승보호자를 관리합니다. 카드를 누르면 30일
            운행 기록·안전교육 만기·미흡 운행을 확인합니다.
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
          {/* 모바일/태블릿: 카드 stack */}
          <ul className="space-y-2 px-4 pb-4 lg:hidden">
            {staffs.map((s) => {
              const isMe = s.id === me.staff.id;
              return (
                <li key={s.id}>
                  <Link
                    href={`/staff/${s.id}`}
                    className="bg-card hover:bg-muted/40 flex items-start justify-between gap-3 rounded-lg border p-3.5 shadow-sm transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={ROLE_BADGE[s.role]}>
                          {ROLE_LABEL[s.role]}
                        </span>
                        <h3 className="text-sm font-extrabold tracking-tight">
                          {s.name}
                          {isMe ? (
                            <span className="text-muted-foreground ml-1.5 text-[10px] font-medium">
                              (나)
                            </span>
                          ) : null}
                        </h3>
                      </div>
                      <p className="text-muted-foreground mt-1.5 text-xs font-medium">
                        ID {s.loginId ?? "—"} · {s.phone || "—"} ·{" "}
                        {s.userId ? "가입 완료" : "미가입"}
                      </p>
                    </div>
                    <ChevronRight className="text-muted-foreground mt-1 h-4 w-4 shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* 데스크톱: 표 — 행 전체 Link */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead className="w-32">로그인 아이디</TableHead>
                  <TableHead className="w-32">역할</TableHead>
                  <TableHead className="w-40">전화</TableHead>
                  <TableHead className="w-24">상태</TableHead>
                  <TableHead className="w-12 pr-[18px] text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffs.map((s) => {
                  const isMe = s.id === me.staff.id;
                  return (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="p-0">
                        <Link
                          href={`/staff/${s.id}`}
                          className="block px-2 py-2 font-medium"
                        >
                          {s.name}
                          {isMe ? (
                            <span className="text-muted-foreground ml-2 text-xs">
                              (나)
                            </span>
                          ) : null}
                        </Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link
                          href={`/staff/${s.id}`}
                          className="block px-2 py-2 font-mono text-xs"
                        >
                          {s.loginId ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link
                          href={`/staff/${s.id}`}
                          className="block px-2 py-2"
                        >
                          <span className={ROLE_BADGE[s.role]}>
                            {ROLE_LABEL[s.role]}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link
                          href={`/staff/${s.id}`}
                          className="text-muted-foreground block px-2 py-2 text-sm"
                        >
                          {s.phone || "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link
                          href={`/staff/${s.id}`}
                          className="text-muted-foreground block px-2 py-2 text-sm"
                        >
                          {s.userId ? "가입 완료" : "미가입"}
                        </Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link
                          href={`/staff/${s.id}`}
                          className="text-muted-foreground flex items-center justify-end pr-[18px] py-2"
                          aria-label="상세"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
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
            <>
              {/* 모바일/태블릿: 카드 stack */}
              <ul className="space-y-2 px-4 pb-4 lg:hidden">
                {invites.map((i) => (
                  <li key={i.id}>
                    <div className="bg-card rounded-lg border p-3.5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={ROLE_BADGE[i.role]}>
                              {ROLE_LABEL[i.role]}
                            </span>
                            <h3 className="text-sm font-extrabold tracking-tight">
                              {i.name}
                            </h3>
                          </div>
                          <p className="text-muted-foreground mt-1.5 text-xs font-medium">
                            ID {i.loginId ?? "—"} · {i.phone} · 만료{" "}
                            {formatDate(i.expiresAt)}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <RevokeInviteButton id={i.id} />
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* 데스크톱: 표 */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead className="w-32">로그인 아이디</TableHead>
                      <TableHead className="w-32">역할</TableHead>
                      <TableHead className="w-40">전화</TableHead>
                      <TableHead className="w-32">만료일</TableHead>
                      <TableHead className="pr-[18px] text-right">관리</TableHead>
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
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
