import { FormSkeleton } from "@/components/skeletons/form-skeleton";

// 차량 편집 — plate/mode/reportNo/insuranceUntil 4 fields (KIDS면 더 길어짐).
export default function VehicleEditLoading() {
  return <FormSkeleton fields={4} />;
}
