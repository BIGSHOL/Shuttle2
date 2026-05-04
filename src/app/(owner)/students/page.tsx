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
import { studentTerm } from "@/lib/i18n/org-terms";

import { DeleteStudentButton } from "./_components/delete-student-button";

const CURRENT_YEAR = new Date().getFullYear();

export default async function StudentsPage() {
  const user = await requireOwner();
  const orgId = await getOrgId();
  const term = studentTerm(user.org.type);

  const students = await db.student.findMany({
    where: { orgId },
    orderBy: [{ birthYear: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { routes: true, guardians: true } },
    },
  });

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{term}</h2>
          <p className="text-muted-foreground text-sm">
            {term}을 등록하고 노선·정류장을 배정합니다. 만 13세 미만은 어린이용
            모드 안전점검 대상입니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/students/new">+ 새 {term}</Link>
        </Button>
      </div>

      {students.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>등록된 {term}이 없습니다</CardTitle>
            <CardDescription>
              {term}을 추가한 뒤, 편집 화면에서 노선·정류장을 배정하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/students/new">+ 새 {term} 등록</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 모바일/태블릿: 카드 stack — 가로 스크롤 회피 */}
          <ul className="space-y-2 lg:hidden">
            {students.map((s) => {
              const age = CURRENT_YEAR - s.birthYear;
              const isKids = age < 13;
              const ageCls = isKids
                ? "bg-bus text-bus-foreground"
                : "bg-muted text-muted-foreground";
              return (
                <li key={s.id}>
                  <div className="bg-card rounded-lg border p-3.5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`${ageCls} rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide`}
                          >
                            {age}세{isKids ? " · 어린이용" : ""}
                          </span>
                          <h3 className="text-sm font-extrabold tracking-tight">
                            {s.name}
                          </h3>
                        </div>
                        <p className="text-muted-foreground mt-1.5 text-xs font-medium">
                          출생 {s.birthYear} · 노선 {s._count.routes}개 ·
                          보호자 {s._count.guardians}명
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/students/${s.id}/edit`}>편집</Link>
                        </Button>
                        <DeleteStudentButton
                          id={s.id}
                          name={s.name}
                          termLabel={term}
                        />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* 데스크톱: 표 */}
          <Card className="hidden py-0 lg:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead className="w-24">출생연도</TableHead>
                    <TableHead className="w-20">만</TableHead>
                    <TableHead className="w-24">노선</TableHead>
                    <TableHead className="w-24">보호자</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => {
                    const age = CURRENT_YEAR - s.birthYear;
                    const isKids = age < 13;
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {s.birthYear}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              // -ml-2: 배지 px-2 만큼 당겨서 헤더 텍스트와 정렬.
                              isKids
                                ? "bg-bus text-bus-foreground -ml-2 rounded-md px-2 py-0.5 text-xs font-bold"
                                : "bg-muted text-muted-foreground -ml-2 rounded-md px-2 py-0.5 text-xs font-medium"
                            }
                          >
                            {age}세 {isKids ? "· 어린이용" : ""}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {s._count.routes}개
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {s._count.guardians}명
                        </TableCell>
                        <TableCell className="space-x-2 text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/students/${s.id}/edit`}>편집</Link>
                          </Button>
                          <DeleteStudentButton
                            id={s.id}
                            name={s.name}
                            termLabel={term}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
