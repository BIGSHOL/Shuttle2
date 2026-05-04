import { FormSkeleton } from "@/components/skeletons/form-skeleton";

// 새 안전교육 기록 — staff Select·category·completedOn·이수증(URL/파일).
export default function TrainingNewLoading() {
  return <FormSkeleton fields={4} />;
}
