// W24-D Phase 1 trip-live: refac Parent App.html "02 · /trip-live" .live-sheet.
// 픽셀 단위 align — refac CSS:
//
//   .live-sheet{background:var(--background);padding:18px 16px 20px;flex:1;
//               display:flex;flex-direction:column;gap:12px}
//
// 풀스크린 fixed 모드 유지 (parent layout sticky header 위에 z-50 띄움).
// gap:12px → 카드 사이 간격 12px.
export function BottomSheet({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background pointer-events-auto fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t">
      <div
        className="flex max-h-[60dvh] flex-col gap-[12px] overflow-y-auto px-[16px] pt-[18px] pb-[20px]"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
      >
        {children}
      </div>
    </div>
  );
}
