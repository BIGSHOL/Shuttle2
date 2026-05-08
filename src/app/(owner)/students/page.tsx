import Link from "next/link";
import { Plus } from "lucide-react";

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
      {/* W24-D Phase 3 #9 students topbar: refac owner-students.jpg.
          큰 H1 + 카운트 sub + 우측 액션 버튼 group. */}
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-black tracking-tight lg:text-4xl leading-tight">
            {term}
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm font-bold">
            전체 {total}명 · {term}을 등록하고 노선·정류장을 배정해요
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            className="bg-bus hover:bg-bus/90 text-bus-foreground font-extrabold"
          >
            <Link href="/students/new">
              <Plus className="mr-1 h-4 w-4" />새 {term}
            </Link>
          </Button>
        </div>
      </section>

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
