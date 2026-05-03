import { db } from "@/lib/db";
import { requireOwner, type CurrentUser } from "@/lib/auth/session";

// 학원장이 본인 학원의 trip만 조회 가능. trip의 vehicle.orgId가 사용자의 orgId와
// 일치하는지 검증. 다른 학원 trip 차단.
export async function requireOwnerTripAccess(tripId: string): Promise<{
  user: CurrentUser;
  trip: { id: string; routeId: string; vehicleId: string; orgId: string };
}> {
  const user = await requireOwner();

  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: {
      id: true,
      routeId: true,
      vehicleId: true,
      vehicle: { select: { orgId: true } },
    },
  });

  if (!trip) throw new Error("FORBIDDEN: trip not found");
  if (trip.vehicle.orgId !== user.org.id) {
    throw new Error("FORBIDDEN: trip belongs to different organization");
  }

  return {
    user,
    trip: {
      id: trip.id,
      routeId: trip.routeId,
      vehicleId: trip.vehicleId,
      orgId: trip.vehicle.orgId,
    },
  };
}
