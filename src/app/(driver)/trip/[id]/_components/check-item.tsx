import { Check } from "lucide-react";

// W24-D Phase 2 driver: refac Driver Run.html "01·03 안전점검" .check-item.
// 픽셀 단위 align — refac CSS:
//
//   .check-item{background:var(--card);border:1px solid var(--line);
//               border-radius:14px;padding:14px;margin-bottom:8px;
//               display:flex;gap:12px;align-items:flex-start}
//   .check-item.done{background:var(--card2);border-color:transparent}
//   .check-item.active{border-color:var(--bus);background:var(--bus-soft);
//                      box-shadow:0 0 0 2px rgba(245,197,24,0.2)}
//   .check-box{width:26px;height:26px;border-radius:8px;
//              border:2px solid var(--line2);background:transparent;
//              margin-top:2px}
//   .check-item.done .check-box{background:var(--ok);border-color:var(--ok)}
//   .check-item.done .check-box svg{color:#fff;width:16px;height:16px;stroke-width:3.5}
//   .check-info h3{font-size:15px;font-weight:800;letter-spacing:-0.01em}
//   .check-item.done .check-info h3{color:var(--ink2)}
//   .check-info p{margin:3px 0 0;font-size:12px;color:var(--mute);
//                 font-weight:600;line-height:1.4}
//   .check-info .who{margin-top:6px;font-size:10px;color:var(--ok);font-weight:800}

export function CheckItem({
  state,
  title,
  description,
  who,
  onToggle,
  pending,
}: {
  state: "pending" | "active" | "done";
  title: string;
  description: string;
  who?: string; // "완료 · 07:36 · 김기사"
  onToggle?: () => void;
  pending?: boolean;
}) {
  const containerCls =
    state === "done"
      ? "bg-muted border-transparent"
      : state === "active"
        ? "bg-bus-soft border-bus shadow-[0_0_0_2px_rgba(245,197,24,0.2)]"
        : "bg-card border-border";

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending || !onToggle}
      className={`mb-2 flex w-full items-start gap-[12px] rounded-[14px] border p-[14px] text-left transition-all disabled:cursor-default ${containerCls}`}
    >
      {/* refac .check-box: 26x26 rounded-8px border-2px line2 */}
      <span
        className={`mt-0.5 grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[8px] border-2 ${
          state === "done"
            ? "bg-success border-success"
            : state === "active"
              ? "border-bus bg-transparent"
              : "border-border bg-transparent"
        }`}
      >
        {state === "done" ? (
          <Check className="h-4 w-4 text-white" strokeWidth={3.5} />
        ) : null}
      </span>
      <div className="min-w-0 flex-1">
        {/* refac .check-info h3: 15px font-800 tracking-(-0.01em) */}
        <h3
          className={`text-[15px] font-extrabold tracking-[-0.01em] ${
            state === "done" ? "text-muted-foreground" : ""
          }`}
        >
          {title}
        </h3>
        {/* refac p: 12px font-600 mute line-1.4 mt-3px */}
        <p className="text-muted-foreground mt-[3px] text-[12px] font-semibold leading-[1.4]">
          {description}
        </p>
        {/* refac .who: 10px font-800 ok mt-6px */}
        {state === "done" && who ? (
          <p className="text-success mt-1.5 text-[10px] font-extrabold tracking-[0.02em]">
            {who}
          </p>
        ) : null}
      </div>
    </button>
  );
}
