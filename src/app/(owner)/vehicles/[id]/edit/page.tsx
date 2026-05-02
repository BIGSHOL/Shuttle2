import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth/session";

import { updateVehicleAction } from "../../actions";
import { VehicleForm } from "../../_components/vehicle-form";

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orgId = await getOrgId();

  // orgId 가드: 다른 기관 차량 ID로 들어오면 not found.
  const vehicle = await db.vehicle.findFirst({
    where: { id, orgId },
  });

  if (!vehicle) {
    notFound();
  }

  const boundAction = updateVehicleAction.bind(null, id);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <VehicleForm
        action={boundAction}
        title={`차량 편집 — ${vehicle.plate}`}
        description="저장하면 즉시 반영됩니다."
        submitLabel="저장"
        initial={{
          plate: vehicle.plate,
          mode: vehicle.mode,
          reportNo: vehicle.reportNo ?? "",
          insuranceUntil: vehicle.insuranceUntil
            ? vehicle.insuranceUntil.toISOString().slice(0, 10)
            : "",
        }}
      />
    </main>
  );
}
