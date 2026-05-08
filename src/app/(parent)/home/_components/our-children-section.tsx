import Link from "next/link";
import { ChevronRight } from "lucide-react";

// W24-D Phase 1 home: data/refac/screenshots/parent-app.jpg "01 · /home"
// "우리 아이" 섹션 픽셀 단위 align — refac CSS:
//
//   .sec{margin-top:18px;display:flex;justify-content:space-between;align-items:center}
//   .sec h3{font-size:13px;font-weight:900;letter-spacing:-0.01em}
//   .sec a{font-size:12px;color:var(--info);font-weight:800}
//   .card{background:var(--card);border:1px solid var(--border);
//         border-radius:14px;padding:14px}
//   .child-card{margin-top:8px;display:flex;gap:12px;align-items:center}
//   .child-ava{width:42px;height:42px;border-radius:999px;
//              background:var(--info-soft);color:var(--info);font-weight:900;
//              font-size:15px;border:1px solid color-mix(info 30%,transparent)}
//   .child-name{font-size:14px;font-weight:900}
//   .pill.bus{background:var(--bus);color:var(--bus-foreground);font-size:10px;
//             font-weight:900;letter-spacing:0.04em;text-transform:uppercase;
//             padding:2px 7px;border-radius:4px}
//   .child-meta{font-size:11px;color:var(--muted-foreground);font-weight:700;margin-top:2px}

export type OurChildrenItem = {
  id: string;
  name: string;
  age: number;
  orgName: string;
  orgType: "ACADEMY" | "DAYCARE" | "KINDERGARTEN";
  routeName: string | null;
  classLabel: string | null;
};

export function OurChildrenSection({ items }: { items: OurChildrenItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="px-4">
      {/* refac .sec: mt-18px flex justify-between */}
      <div className="mt-[18px] flex items-center justify-between">
        <h3 className="text-[13px] font-black tracking-[-0.01em]">우리 아이</h3>
        <Link href="/me" className="text-info text-[12px] font-extrabold">
          아이 추가
        </Link>
      </div>
      <ul className="mt-2 space-y-2">
        {items.map((c) => (
          <li key={c.id}>
            <Link
              href="/me"
              className="bg-card border-border flex items-center gap-3 rounded-[14px] border p-[14px]"
            >
              {/* refac .child-ava: 42px round info-soft, 15px font-900, info-30% border */}
              <span
                className="bg-info-soft text-info border-info/30 grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full border text-[15px] font-black"
                aria-hidden
              >
                {c.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] font-black">{c.name}</span>
                  {c.classLabel ? (
                    <span className="bg-bus text-bus-foreground inline-flex items-center rounded-[4px] px-[7px] py-[2px] text-[10px] font-black uppercase tracking-[0.04em]">
                      {c.classLabel}
                    </span>
                  ) : null}
                </div>
                <p className="text-muted-foreground mt-0.5 truncate text-[11px] font-bold">
                  {/* refac child-meta: "5세 · 해솔어린이집 · A노선" — orgName이 이미 종류 식별,
                      orgType 별도 노출 안 함. routeName 있으면 추가. */}
                  {c.age}세 · {c.orgName}
                  {c.routeName ? ` · ${c.routeName}` : ""}
                </p>
              </div>
              <ChevronRight
                className="text-muted-foreground h-[18px] w-[18px] shrink-0"
                strokeWidth={2}
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
