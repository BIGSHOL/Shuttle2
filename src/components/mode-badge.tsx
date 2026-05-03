import { Badge } from "@/components/ui/badge";

// KIDS / GENERAL 모드 시각 구분.
// docs/01: KIDS는 노란 점 + bg-bus, GENERAL은 secondary.
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
        KIDS
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className={className}>
      일반
    </Badge>
  );
}
