import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { ChildAvatar } from "@/components/shuttlee/child-avatar";

// W24-D Phase 1 home: refac Parent App.html "우리 아이" 섹션.
// `<div class="sec"><h3>우리 아이</h3><a>아이 추가</a></div>`
// `<div class="card child-card">avatar + name + pill + meta + chevron</div>`
//
// 자녀 클릭 → 자녀 detail (학부모 입장에서 별도 페이지 없으면 결석/정류장 변경 진입).
// "아이 추가"는 학원 초대 토큰 흐름 안내 (베타: 학원장에 요청 메시지).

const ORG_TYPE_LABEL = {
  ACADEMY: "학원",
  DAYCARE: "어린이집",
  KINDERGARTEN: "유치원",
} as const;

export type OurChildrenItem = {
  id: string;
  name: string;
  age: number;
  orgName: string;
  orgType: "ACADEMY" | "DAYCARE" | "KINDERGARTEN";
  routeName: string | null;
  classLabel: string | null; // "햇살반" 등 — 베타에서는 학년·반 미보유, 일단 null
};

export function OurChildrenSection({
  items,
}: {
  items: OurChildrenItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="px-4">
      <div className="mb-2 flex items-end justify-between gap-2">
        <h2 className="text-[13px] font-black tracking-tight">우리 아이</h2>
        <Link
          href="/me"
          className="text-info text-[12px] font-extrabold"
        >
          아이 추가
        </Link>
      </div>
      <ul className="space-y-2">
        {items.map((c) => (
          <li key={c.id}>
            <Link
              href="/me"
              className="bg-card hover:bg-muted/40 flex items-center gap-3 rounded-lg border p-3.5 shadow-sm transition-colors"
            >
              <ChildAvatar name={c.name} tone="idle" size="default" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black tracking-tight">
                    {c.name}
                  </span>
                  {c.classLabel ? (
                    <span className="bg-bus text-bus-foreground rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                      {c.classLabel}
                    </span>
                  ) : null}
                </div>
                <p className="text-muted-foreground mt-0.5 truncate text-[11px] font-bold">
                  {c.age}세 · {c.orgName} · {ORG_TYPE_LABEL[c.orgType]}
                  {c.routeName ? ` · ${c.routeName}` : ""}
                </p>
              </div>
              <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
