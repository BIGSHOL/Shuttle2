import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// W24-D Phase 1 form pages: data/refac/design-files/Parent App.html ".form-back"
// 영역. 학부모 PWA의 결석·정류장 변경 form pages 공통 헤더.
//
//   <chevron-left button> {title}
//
// refac CSS:
//   .form-back { padding:8px 8px 0; display:flex; align-items:center; gap:8px;
//                background:var(--background); }
//   .form-back h1 { margin:0; font-size:16px; font-weight:900; }
export function FormBackHeader({
  title,
  href,
}: {
  title: string;
  href: string;
}) {
  return (
    <header className="bg-background sticky top-0 z-10 flex items-center gap-2 px-2 pt-2 pb-1">
      <Link
        href={href}
        className="text-muted-foreground hover:bg-muted/60 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        aria-label="뒤로"
      >
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <h1 className="text-base font-black tracking-tight">{title}</h1>
    </header>
  );
}
