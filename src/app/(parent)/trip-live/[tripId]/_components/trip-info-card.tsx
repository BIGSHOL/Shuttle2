// W24-D Phase 1 trip-live: data/refac/screenshots/parent-app.jpg "02 · /trip-live"
// 하단 운행 정보 카드 reproduce. refac:
//   <div class="card" padding 10/14>
//     운행 정보 [8.4km · 22분 경과 pill]
//     김기사님 + 동승 이도우미님 · 25인승 어린이용 차량 · 11/14 탑승 중
//
// distanceKm·elapsedMinutes는 trip-stats utility에서 client side로 계산.
// 차량 capacity는 schema에 없어 plate + KIDS 표시로 대체.
export function TripInfoCard({
  driverName,
  helperName,
  vehiclePlate,
  vehicleMode,
  distanceKm,
  elapsedMinutes,
  boardedCount,
  totalAssigned,
}: {
  driverName: string;
  helperName: string | null;
  vehiclePlate: string;
  vehicleMode: "KIDS" | "GENERAL";
  distanceKm: number | null;
  elapsedMinutes: number | null;
  boardedCount: number;
  totalAssigned: number;
}) {
  const pillText =
    distanceKm !== null && elapsedMinutes !== null
      ? `${distanceKm.toFixed(1)}km · ${elapsedMinutes}분 경과`
      : null;

  return (
    <div className="bg-card rounded-md border px-3.5 py-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[12px] font-black tracking-tight">운행 정보</p>
        {pillText ? (
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-tight">
            {pillText}
          </span>
        ) : null}
      </div>
      <p className="text-muted-foreground text-[12px] font-bold leading-relaxed">
        <span className="text-foreground font-black">{driverName} 기사님</span>
        {helperName ? ` + 동승 ${helperName}님` : ""} · {vehiclePlate}
        {vehicleMode === "KIDS" ? " · 어린이통학버스" : ""} · {boardedCount}/
        {totalAssigned} 탑승 중
      </p>
    </div>
  );
}
