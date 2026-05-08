import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// 자녀 사진 placeholder — Student 모델에 photoUrl 없음. 이름 첫 글자로 표시.
// tone: "live"는 노란 강조 (운행 중 카드용), "idle"은 뉴트럴.
export function ChildAvatar({
  name,
  tone = "idle",
  size = "default",
  className,
}: {
  name: string;
  tone?: "live" | "idle";
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const initial = name.trim().slice(0, 1) || "?";

  return (
    <Avatar size={size} className={className}>
      {tone === "live" ? (
        <AvatarFallback className="bg-bus text-bus-foreground border-bus-foreground/20 border font-bold">
          {initial}
        </AvatarFallback>
      ) : (
        <AvatarFallback className="bg-muted text-muted-foreground border-border border font-bold">
          {initial}
        </AvatarFallback>
      )}
    </Avatar>
  );
}
