import { FormSkeleton } from "@/components/skeletons/form-skeleton";

// 새 학생 등록 — name·birthYear·grade Select.
export default function StudentNewLoading() {
  return <FormSkeleton fields={3} />;
}
