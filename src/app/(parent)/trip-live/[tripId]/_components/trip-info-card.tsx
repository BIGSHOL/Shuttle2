// W24-D Phase 1 trip-live: refac Parent App.html "02 · /trip-live" 운행 정보 card.
// 픽셀 단위 align — refac:
//   <div class="card" style="padding:10px 14px">
//     <row> "운행 정보" + pill "8.4km · 22분 경과" </row>
//     <line> {driver}님 + 동승 {helper}님 · 25인승 어린이용 차량 · 11/14 탑승 중 </line>
//
// .card { background:var(--card); border:1px solid var(--border);
//         border-radius:14px; padding:14px (override 10px 14px) }
// .pill.muted { background:var(--muted); color:var(--muted-foreground);
//               font-size:10px; font-weight:900; letter-spacing:0.04em;
//               text-transform:uppercase; padding:2px 7px; border-radius:4px }

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
    <div className="bg-card border-border rounded-[14px] border px-[14px] py-[10px]">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        {/* refac inline style 12px font-900 letter-spacing-(-0.01em) */}
        <p className="text-[12px] font-black tracking-[-0.01em]">운행 정보</p>
        {pillText ? (
          // refac .pill.muted: 10px font-900 caps tracking-0.04em rounded-[4px] px-[7px] py-[2px]
          <span className="bg-muted text-muted-foreground inline-flex items-center rounded-[4px] px-[7px] py-[2px] text-[10px] font-black uppercase tracking-[0.04em]">
            {pillText}
          </span>
        ) : null}
      </div>
      {/* refac body: 12px font-700 muted line-height-1.5, strong foreground 800 */}
      <p className="text-muted-foreground text-[12px] font-bold leading-[1.5]">
        <span className="text-foreground font-extrabold">{driverName} 기사님</span>
        {helperName ? ` + 동승 ${helperName}님` : ""} · {vehiclePlate}
        {vehicleMode === "KIDS" ? " · 어린이통학버스" : ""} · {boardedCount}/
        {totalAssigned} 탑승 중
      </p>
    </div>
  );
}
