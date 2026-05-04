import { FormSkeleton } from "@/components/skeletons/form-skeleton";

// 학생 편집 — name/birthYear + 보호자 link + 노선·정류장 배정 카드.
// 폼 카드만 첫 페이즈로 보여주고, 나머지는 페이지 본 컨텐츠가 재빠르게 채움.
export default function StudentEditLoading() {
  return <FormSkeleton fields={3} />;
}
