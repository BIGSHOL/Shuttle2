import { FormSkeleton } from "@/components/skeletons/form-skeleton";

// 노선 편집 — name·direction·vehicle·weekdays + 정류장 순서·학생 배정.
export default function RouteEditLoading() {
  return <FormSkeleton fields={4} />;
}
