import { FormSkeleton } from "@/components/skeletons/form-skeleton";

// 직원 초대 — name·phone·loginId·role·발급 버튼.
export default function StaffInviteLoading() {
  return <FormSkeleton fields={4} />;
}
