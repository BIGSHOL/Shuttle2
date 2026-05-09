import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// W24-D Phase 1 form pages: refac Parent App.html .form-back 픽셀 단위 align.
//
//   .form-back{padding:8px 8px 0;display:flex;align-items:center;gap:8px;
//              background:var(--background)}
//   .form-back .icon-btn{background:transparent;border:0}
//   .form-back h1{font-size:16px;font-weight:900}
export function FormBackHeader({
  title,
  href,
}: {
  title: string;
  href: string;
}) {
  return (
    <header className="bg-background sticky top-0 z-10 flex items-center gap-[8px] px-[8px] pt-[8px] pb-0">
      <Link
        href={href}
        className="text-muted-foreground grid h-9 w-9 shrink-0 place-items-center"
        aria-label="뒤로"
      >
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <h1 className="text-[16px] font-black">{title}</h1>
    </header>
  );
}
