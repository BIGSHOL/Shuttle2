import { requireOwner } from "@/lib/auth/session";
import { studentTerm } from "@/lib/i18n/org-terms";

import { createStudentAction } from "../actions";
import { StudentForm } from "../_components/student-form";

export default async function NewStudentPage() {
  const user = await requireOwner();
  const term = studentTerm(user.org.type);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <StudentForm
        action={createStudentAction}
        termLabel={term}
        title={`새 ${term} 등록`}
        description={`기본 정보를 저장한 뒤, 다음 화면에서 노선·정류장을 배정합니다.`}
        submitLabel="등록 + 노선 배정"
      />
    </main>
  );
}
