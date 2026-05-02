import { TripScreen } from "@/app/(driver)/trip/[id]/trip-screen";

// helper도 driver와 같은 trip 화면을 본다 (TripScreen 내부에서 isDriver/isHelper로 분기).
// 라우트 그룹만 (helper)이라 (helper)/layout이 requireHelper로 가드.
export default async function HelperTripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TripScreen tripId={id} />;
}
