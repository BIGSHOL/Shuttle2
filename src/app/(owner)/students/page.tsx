import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOrgId, requireOwner } from "@/lib/auth/session";
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

  const [students, total, schools] = await Promise.all([
    listStudents(orgId, parsed),
    countStudents(orgId, parsed),
    listSchools(orgId),
  ]);

  const filtered = hasActiveFilters(parsed);

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

      <StudentsToolbar
        schools={schools}
        current={parsed}
        termLabel={term}
      />

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
          <StudentsPagination
            current={parsed}
            total={total}
            termLabel={term}
          />
        </>
      )}
    </main>
  );
}
