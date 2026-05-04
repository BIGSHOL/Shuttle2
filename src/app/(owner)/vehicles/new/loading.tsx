import { FormSkeleton } from "@/components/skeletons/form-skeleton";

// 새 차량 등록.
export default function VehicleNewLoading() {
  return <FormSkeleton fields={4} />;
}
