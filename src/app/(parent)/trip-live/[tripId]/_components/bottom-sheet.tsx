// 풀스크린 지도 위에 띄우는 bottom sheet. CSS만으로 구현 (드래그 X).
// docs/02 spec: rounded-t-2xl, handle bar, max-height 60dvh.
export function BottomSheet({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card pointer-events-auto fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md rounded-t-2xl border-t shadow-[0_-8px_24px_rgba(20,22,28,0.06)]">
      <div
        className="max-h-[60dvh] overflow-y-auto px-5 pt-2 pb-5"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        {/* handle bar */}
        <div className="bg-border mx-auto mb-3 h-1 w-10 rounded-full" />
        {children}
      </div>
    </div>
  );
}
