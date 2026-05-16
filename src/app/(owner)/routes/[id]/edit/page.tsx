import { notFound } from "next/navigation";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth/session";

import { updateRouteAction } from "../../actions";
import { RouteForm } from "../../_components/route-form";
import { RouteStopsSection } from "./route-stops-section";

export default async function EditRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orgId = await getOrgId();

  const route = await db.route.findFirst({
    where: { id, vehicle: { orgId } },
    include: {
      stops: {
        orderBy: { order: "asc" },
        include: { stop: { select: { id: true, name: true } } },
      },
    },
  });

  if (!route) {
    notFound();
  }

  const [vehicles, stops] = await Promise.all([
    db.vehicle.findMany({
      where: { orgId },
      orderBy: [{ mode: "asc" }, { plate: "asc" }],
      select: { id: true, plate: true, mode: true },
    }),
    db.stop.findMany({
      // W26-E: 미사용 정류장은 신규 RouteStop picker에서 제외
      where: { orgId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const boundUpdate = updateRouteAction.bind(null, id);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold">노선 편집 — {route.name}</h2>
        <p className="text-muted-foreground text-sm">
          기본 정보를 수정하거나 정류장 순서를 추가·삭제하세요.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
          <CardDescription>저장하면 즉시 반영됩니다.</CardDescription>
        </CardHeader>
        <RouteForm
          action={boundUpdate}
          vehicles={vehicles}
          initial={{
            vehicleId: route.vehicleId,
            name: route.name,
            direction: route.direction,
            weekdays: route.weekdays,
            isActive: route.isActive,
          }}
          title=""
          submitLabel="기본 정보 저장"
          showBasicCard={false}
        />
      </Card>

      <RouteStopsSection
        routeId={id}
        routeStops={route.stops.map((rs) => ({
          id: rs.id,
          order: rs.order,
          scheduledAt: rs.scheduledAt,
          stop: rs.stop,
        }))}
        stops={stops}
      />
    </main>
  );
}
