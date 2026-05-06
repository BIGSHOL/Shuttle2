// 기사용 RN 앱이 서버에서 받는 응답 type. server 함수의 return type과 동일.
// shared-contracts에 두는 이유는 서버·RN 양쪽이 같은 type을 보장하기 위함.

export type RouteDirection = "PICKUP" | "DROPOFF";
export type VehicleMode = "KIDS" | "GENERAL";
export type BoardingType = "BOARD" | "ALIGHT" | "NO_SHOW" | "NO_DROPOFF";

// GET /api/driver/trip/[id]
export type TripDetailPayload = {
  trip: {
    id: string;
    startedAt: string | null;
    endedAt: string | null;
    helperId: string | null;
    routeId: string;
    vehicleId: string;
  };
  route: {
    id: string;
    name: string;
    direction: RouteDirection;
  };
  vehicle: {
    id: string;
    plate: string;
    mode: VehicleMode;
  };
  stops: Array<{
    routeStopId: string;
    stopId: string;
    name: string;
    lat: number;
    lng: number;
    radiusM: number;
    order: number;
    scheduledAt: string;
    students: Array<{ id: string; name: string }>;
  }>;
  events: Array<{
    id: string;
    studentId: string;
    type: BoardingType;
    at: string;
    notes: string | null;
  }>;
  safetyCheck: {
    seatbeltAllOk: boolean;
    helperPresent: boolean;
    allAlightedOk: boolean;
    seatbeltCheckedAt: string | null;
    alightCheckedAt: string | null;
  } | null;
};

// GET /api/driver/today-routes
export type TodayRoutesPayload = {
  routes: Array<{
    id: string;
    name: string;
    direction: RouteDirection;
    vehicleId: string;
    vehiclePlate: string;
    vehicleMode: VehicleMode;
    firstScheduledAt: string | null;
    stopCount: number;
  }>;
  activeTrip: {
    id: string;
    routeId: string;
    routeName: string;
  } | null;
};
