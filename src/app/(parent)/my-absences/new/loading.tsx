import { FormSkeleton } from "@/components/skeletons/form-skeleton";

// 학부모 결석 신청 — 자녀 Select·날짜·종류(등·하원·둘 다)·사유.
// 모바일 폭이라 outerClassName 다름.
export default function AbsenceNewLoading() {
  return (
    <FormSkeleton
      fields={4}
      outerClassName="space-y-4 px-4 pt-4 pb-6"
      showHeader={false}
    />
  );
}
