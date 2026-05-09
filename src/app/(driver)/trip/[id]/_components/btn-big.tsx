// W24-D Phase 2 driver: refac Driver Run.html .btn-big.
// 픽셀 단위 align — refac CSS:
//
//   .btn-big{width:100%;height:62px;border-radius:18px;
//            background:var(--bus);color:var(--bus-ink);border:0;
//            font-size:17px;font-weight:900;letter-spacing:-0.01em;
//            display:flex;align-items:center;justify-content:center;gap:8px;
//            box-shadow:0 8px 24px rgba(245,197,24,0.35)}
//   .btn-big.disabled{background:var(--card);color:var(--mute);
//                     box-shadow:none;cursor:not-allowed}
//   .btn-big.danger{background:var(--danger);color:#fff;
//                   box-shadow:0 8px 24px rgba(255,97,85,0.35)}
//   .btn-big svg{width:18px;height:18px}

import type { ButtonHTMLAttributes, ReactNode } from "react";

export function BtnBig({
  variant = "primary",
  icon,
  children,
  disabled,
  className = "",
  ...rest
}: {
  variant?: "primary" | "danger" | "disabled";
  icon?: ReactNode;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const eff = disabled ? "disabled" : variant;
  const cls =
    eff === "primary"
      ? "bg-bus text-bus-foreground shadow-[0_8px_24px_rgba(245,197,24,0.35)]"
      : eff === "danger"
        ? "bg-destructive text-white shadow-[0_8px_24px_rgba(255,97,85,0.35)]"
        : "bg-muted text-muted-foreground cursor-not-allowed";

  return (
    <button
      type="button"
      disabled={disabled}
      {...rest}
      className={`flex h-[62px] w-full items-center justify-center gap-2 rounded-[18px] text-[17px] font-black tracking-[-0.01em] [&>svg]:h-[18px] [&>svg]:w-[18px] ${cls} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}
