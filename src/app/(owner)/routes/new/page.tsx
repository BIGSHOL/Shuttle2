import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth/session";

import { createRouteAction } from "../actions";
import { RouteForm } from "../_components/route-form";

export default async function NewRoutePage() {
  const orgId = await getOrgId();

  const vehicles = await db.vehicle.findMany({
    where: { orgId },
    orderBy: [{ mode: "asc" }, { plate: "asc" }],
    select: { id: true, plate: true, mode: true },
  });

  return (
    <main className="mx-auto max-w-3xl p-6">
      <RouteForm
        action={createRouteAction}
        vehicles={vehicles}
        title="새 노선 등록"
        description="기본 정보를 저장한 뒤, 다음 화면에서 정류장 순서를 추가합니다."
        submitLabel="등록 + 정류장 추가"
      />
    </main>
  );
}
