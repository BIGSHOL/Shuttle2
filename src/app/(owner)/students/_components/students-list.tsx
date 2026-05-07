import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { gradeFromBirthYear } from "@/lib/student/grade";

import { DeleteStudentButton } from "./delete-student-button";
import type { StudentRow } from "../_lib/query";

const CURRENT_YEAR = new Date().getFullYear();

export function StudentsList({
  students,
  termLabel,
}: {
  students: StudentRow[];
  termLabel: "학생" | "원아";
}) {
  return (
    <>
      {/* 모바일/태블릿: 카드 stack — 가로 스크롤 회피 */}
      <ul className="space-y-2 lg:hidden">
        {students.map((s) => {
          const age = CURRENT_YEAR - s.birthYear;
          const isKids = age < 13;
          const ageCls = isKids
            ? "bg-bus text-bus-foreground"
            : "bg-muted text-muted-foreground";
          const grade = gradeFromBirthYear(s.birthYear);
          return (
            <li key={s.id}>
              <div className="bg-card rounded-lg border shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  {/* 메인 영역 — 카드 클릭 시 학생 상세로 (W20-A) */}
                  <Link
                    href={`/students/${s.id}`}
                    className="hover:bg-muted/40 min-w-0 flex-1 rounded-lg p-3.5 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="bg-info-soft text-info rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide">
                        {grade}
                      </span>
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
                      {s.school ? `${s.school} · ` : ""}출생 {s.birthYear} · 노선{" "}
                      {s._count.routes}개 · 보호자 {s._count.guardians}명
                    </p>
                  </Link>
                  <div className="flex shrink-0 flex-col items-end gap-1.5 p-3.5">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/students/${s.id}/edit`}>편집</Link>
                    </Button>
                    <DeleteStudentButton
                      id={s.id}
                      name={s.name}
                      termLabel={termLabel}
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
                <TableHead className="w-20">학년</TableHead>
                <TableHead className="w-44">학교</TableHead>
                <TableHead className="w-24">출생연도</TableHead>
                <TableHead className="w-20">만</TableHead>
                <TableHead className="w-24">노선</TableHead>
                <TableHead className="w-24">보호자</TableHead>
                <TableHead className="pr-[18px] text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => {
                const age = CURRENT_YEAR - s.birthYear;
                const isKids = age < 13;
                const grade = gradeFromBirthYear(s.birthYear);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/students/${s.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {s.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="bg-info-soft text-info rounded-md px-2 py-0.5 text-xs font-bold">
                        {grade}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate text-sm">
                      {s.school ?? (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {s.birthYear}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          isKids
                            ? "bg-bus text-bus-foreground rounded-md px-2 py-0.5 text-xs font-bold"
                            : "bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-medium"
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
                        termLabel={termLabel}
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
  );
}
