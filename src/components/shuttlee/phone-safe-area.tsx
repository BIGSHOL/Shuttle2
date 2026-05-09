// docs/12 §4 — 학부모/기사 PWA 의 status bar / home indicator 패딩 wrapper.
//
// iOS Safari의 notch + home indicator를 피해 콘텐츠가 안전 영역 안에 들어가도록
// `env(safe-area-inset-*)` CSS 환경 변수 적용.

import type { ReactNode } from "react";

export function PhoneSafeArea({
  children,
  className,
  top = true,
  bottom = true,
}: {
  children: ReactNode;
  className?: string;
  // status bar 안전 영역 (default true)
  top?: boolean;
  // home indicator 안전 영역 (default true)
  bottom?: boolean;
}) {
  const style: React.CSSProperties = {
    paddingTop: top ? "env(safe-area-inset-top)" : undefined,
    paddingBottom: bottom ? "env(safe-area-inset-bottom)" : undefined,
    paddingLeft: "env(safe-area-inset-left)",
    paddingRight: "env(safe-area-inset-right)",
  };
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
