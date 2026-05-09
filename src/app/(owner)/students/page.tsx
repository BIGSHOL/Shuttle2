import Link from "next/link";
import { AlertTriangle, Baby, CalendarOff, MapPinOff, Users } from "lucide-react";

import { KpiStrip, KpiStripCell } from "@/components/kpi-card";
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
import { todayUtcDateKst } from "@/lib/date/today";
import { studentTerm } from "@/lib/i18n/org-terms";

import { StudentsList } from "./_components/students-list";
import { StudentsPagination } from "./_components/students-pagination";
import { StudentsToolbar } from "./_components/students-toolbar";
import {
  countStudents,
  hasActiveFilters,
  listSchools,
  listStudents,
  parseStudentsSearchParams,
  type RawSearchParams,
} from "./_lib/query";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const user = await requireOwner();
  const orgId = await getOrgId();
  const term = studentTerm(user.org.type);
  const parsed = parseStudentsSearchParams(await searchParams);

  const todayDate = todayUtcDateKst();
  const sevenDaysAgo = new Date(todayDate);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  const thisYear = new Date().getUTCFullYear();

  const [
    students,
    total,
    schools,
    kidsModeStudents,
    unassignedCount,
    todayAbsenceCount,
    thisWeekNoShowCount,
  ] = await Promise.all([
    listStudents(orgId, parsed),
    countStudents(orgId, parsed),
    listSchools(orgId),
    // 어린이용 차량 노선에 배정된 학생 (만 13세 미만 의무 대상). 학생.birthYear
    // 기반이 정확하지만 자녀가 노선에 배정 안 됐을 수도. 단순 birthYear 13세 미만.
    db.student.count({
      where: { orgId, birthYear: { gte: thisYear - 12 } },
    }),
    // 노선 미배정 학생.
    db.student.count({
      where: { orgId, routes: { none: {} } },
    }),
    // 오늘 결석 신청 (PENDING + 처리됨 모두).
    db.absenceRequest.count({
      where: { student: { orgId }, date: todayDate },
    }),
    // 이번 주(7일) 미탑승 이벤트 학생 수.
    db.boardingEvent.count({
      where: {
        type: "NO_SHOW",
        trip: { vehicle: { orgId }, date: { gte: sevenDaysAgo } },
      },
    }),
  ]);

  const filtered = hasActiveFilters(parsed);

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 lg:p-6">
      {/* 페이지 헤더 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight lg:text-3xl">
            {term}
          </h2>
          <p className="text-muted-foreground mt-1 text-xs font-semibold lg:text-sm">
            {term}을 등록하고 노선·정류장을 배정합니다. 만 13세 미만은 어린이용
            모드 안전점검 대상입니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/students/new">+ 새 {term}</Link>
        </Button>
      </div>

      {/* KPI strip 5 */}
      <KpiStrip cols={5}>
        <KpiStripCell
          label={`전체 ${term}`}
          value={total}
          subtext="현재 등록 인원"
          Icon={Users}
          tone="info"
        />
        <KpiStripCell
          label="어린이용 대상"
          value={kidsModeStudents}
          subtext="만 13세 미만"
          Icon={Baby}
          tone="bus"
        />
        <KpiStripCell
          label="노선 미배정"
          value={unassignedCount}
          subtext={unassignedCount > 0 ? "정류장 배정 필요" : "전원 배정 완료"}
          Icon={MapPinOff}
          tone={unassignedCount > 0 ? "warning" : "success"}
        />
        <KpiStripCell
          label="오늘 결석"
          value={todayAbsenceCount}
          subtext="등하원 결석 신청"
          Icon={CalendarOff}
          tone={todayAbsenceCount > 0 ? "warning" : "muted"}
        />
        <KpiStripCell
          label="이번 주 미탑승"
          value={thisWeekNoShowCount}
          subtext="최근 7일 누적"
          Icon={AlertTriangle}
          tone={thisWeekNoShowCount > 0 ? "destructive" : "success"}
        />
      </KpiStrip>

      <StudentsToolbar schools={schools} current={parsed} termLabel={term} />

      {total === 0 && !filtered ? (
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
      ) : total === 0 && filtered ? (
        <Card>
          <CardHeader>
            <CardTitle>조건에 맞는 {term}이 없습니다</CardTitle>
            <CardDescription>
              검색어·필터를 변경하거나 초기화해 보세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/students">필터 초기화</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <StudentsList students={students} termLabel={term} />
          <StudentsPagination current={parsed} total={total} termLabel={term} />
        </>
      )}
    </main>
  );
}
