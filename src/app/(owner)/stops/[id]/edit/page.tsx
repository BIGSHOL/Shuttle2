import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth/session";

import { updateStopAction } from "../../actions";
import { StopForm } from "../../_components/stop-form";

export default async function EditStopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orgId = await getOrgId();

  const stop = await db.stop.findFirst({
    where: { id, orgId },
  });

  if (!stop) {
    notFound();
  }

  const boundAction = updateStopAction.bind(null, id);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <StopForm
        action={boundAction}
        title={`정류장 편집 — ${stop.name}`}
        description="이름·위치·반경을 수정합니다."
        submitLabel="저장"
        initial={{
          name: stop.name,
          lat: stop.lat,
          lng: stop.lng,
          radiusM: stop.radiusM,
          address: stop.address,
        }}
      />
    </main>
  );
}
