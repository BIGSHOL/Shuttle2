import { FormSkeleton } from "@/components/skeletons/form-skeleton";

// 보호자 초대 — 자녀 선택(체크박스 list) + name·phone·relation·loginId.
// 자녀 list가 fetch 후 렌더되므로 loading.tsx 효과 큼.
export default function GuardianInviteLoading() {
  return <FormSkeleton fields={5} />;
}
