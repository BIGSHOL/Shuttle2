import { db } from "@/lib/db";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/session";

// driver 본인 또는 helper로 지정된 staff만 trip에 접근 가능.
// (helper는 KIDS 모드 운행에 공동 책임. driver와 같은 trip 화면 공유)
export async function requireTripAccess(tripId: string): Promise<{
  user: CurrentUser;
  isDriver: boolean;
  isHelper: boolean;
}> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  if (user.staff.role !== "DRIVER" && user.staff.role !== "HELPER") {
    throw new Error("FORBIDDEN: DRIVER or HELPER required");
  }

  const trip = await db.trip.findFirst({
    where: {
      id: tripId,
      vehicle: { orgId: user.org.id },
      OR: [{ driverId: user.staff.id }, { helperId: user.staff.id }],
    },
    select: { id: true, driverId: true, helperId: true },
  });
  if (!trip) throw new Error("FORBIDDEN: trip access denied");

  return {
    user,
    isDriver: trip.driverId === user.staff.id,
    isHelper: trip.helperId === user.staff.id,
  };
}
