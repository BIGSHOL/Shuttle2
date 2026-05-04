import { FormSkeleton } from "@/components/skeletons/form-skeleton";

// 새 노선 등록.
export default function RouteNewLoading() {
  return <FormSkeleton fields={4} />;
}
