// 운행 중 LIVE 표시용 작은 노란 점 (bus 토큰).
export function LivePulseDot({ className }: { className?: string }) {
  return (
    <span className={`relative inline-flex ${className ?? ""}`}>
      <span className="bg-bus absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
      <span className="bg-bus relative inline-flex h-2 w-2 rounded-full" />
    </span>
  );
}
