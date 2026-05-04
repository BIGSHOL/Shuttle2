import { Badge } from "@/components/ui/badge";

// KIDS / GENERAL 모드 시각 구분 (사용자 노출은 한글로).
// docs/01: 어린이용은 노란 점 + bg-bus, 일반용은 secondary.
export function ModeBadge({
  mode,
  className,
}: {
  mode: "KIDS" | "GENERAL";
  className?: string;
}) {
  if (mode === "KIDS") {
    return (
      <Badge
        className={`bg-bus text-bus-foreground border-bus hover:bg-bus/90 ${className ?? ""}`}
      >
        어린이용
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className={className}>
      일반용
    </Badge>
  );
}
