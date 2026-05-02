import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireDriver } from "@/lib/auth/session";

import { TripRunningView } from "./trip-running-view";

export default async function TripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await requireDriver();
  const orgId = me.org.id;

  const trip = await db.trip.findFirst({
    where: { id, driverId: me.staff.id, vehicle: { orgId } },
    include: {
      route: {
        include: {
          stops: {
            orderBy: { order: "asc" },
            include: {
              stop: {
                select: {
                  id: true,
                  name: true,
                  lat: true,
                  lng: true,
                  radiusM: true,
                },
              },
            },
          },
        },
      },
      vehicle: { select: { plate: true, mode: true } },
    },
  });

  if (!trip) notFound();

  // 종료된 trip이면 요약 카드만 보여줌.
  if (trip.endedAt) {
    return (
      <main className="mx-auto max-w-3xl p-4">
        <Card>
          <CardHeader>
            <CardTitle>운행 종료</CardTitle>
            <CardDescription>
              <span className="font-medium">{trip.route.name}</span> 운행이
              종료되었습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              시작:{" "}
              <span className="font-mono">
                {trip.startedAt?.toISOString().slice(11, 16) ?? "—"}
              </span>
            </p>
            <p>
              종료:{" "}
              <span className="font-mono">
                {trip.endedAt.toISOString().slice(11, 16)}
              </span>
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <TripRunningView
      tripId={trip.id}
      route={{
        name: trip.route.name,
        direction: trip.route.direction,
      }}
      vehicle={trip.vehicle}
      stops={trip.route.stops.map((rs) => ({
        id: rs.id,
        order: rs.order,
        scheduledAt: rs.scheduledAt,
        name: rs.stop.name,
        lat: rs.stop.lat,
        lng: rs.stop.lng,
        radiusM: rs.stop.radiusM,
      }))}
      isKidsMode={trip.vehicle.mode === "KIDS"}
      startedAtISO={trip.startedAt?.toISOString() ?? null}
    />
  );
}
