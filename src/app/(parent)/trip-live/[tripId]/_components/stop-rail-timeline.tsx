// 정류장 vertical rail timeline.
// lofi parent.jsx ParentLive 미러 — 좌측 line + 점 (done/next/pending) + label.

type RailItem = {
  id: string;
  order: number;
  name: string;
  scheduledAt: string;
  status: "done" | "next" | "pending";
  isChildStop: boolean;
};

export function StopRailTimeline({ items }: { items: RailItem[] }) {
  return (
    <div className="relative pl-3.5">
      {/* vertical rail */}
      <div className="bg-border absolute top-2 bottom-2 left-[5px] w-0.5" />
      {items.map((s) => (
        <RailRow key={s.id} item={s} />
      ))}
    </div>
  );
}

function RailRow({ item }: { item: RailItem }) {
  const isPending = item.status === "pending";
  const isNext = item.status === "next";
  const isDone = item.status === "done";

  // 점: done = bg-success / next = bg-bus + ring / pending = white + border
  const dotClass = isDone
    ? "bg-success border-success"
    : isNext
      ? "bg-bus border-bus ring-4 ring-bus/20"
      : "bg-background border-border";

  return (
    <div className="relative flex items-center gap-2.5 py-1.5">
      <span
        className={`absolute left-[-9px] h-3 w-3 rounded-full border-2 ${dotClass}`}
        aria-hidden
      />
      <span className="text-muted-foreground w-10 shrink-0 text-[11px] font-semibold tabular-nums">
        {item.scheduledAt}
      </span>
      <span
        className={`flex-1 text-sm ${
          isNext
            ? "font-bold"
            : isPending
              ? "text-muted-foreground font-medium"
              : "text-foreground font-medium"
        }`}
      >
        {item.name}
        {item.isChildStop ? (
          <span className="text-bus-foreground bg-bus-soft ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold">
            자녀
          </span>
        ) : null}
      </span>
    </div>
  );
}
