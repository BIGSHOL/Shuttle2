import Link from "next/link";

import { db } from "@/lib/db";

import { AllStopsMap } from "./_components/all-stops-map";

// W24: 매니저 — 전체 학원의 정류장 cross-org 지도 + list.
// 각 정류장 행 → /admin/orgs/[orgId] 학원 360°로 이동 (정류장 자체 detail은
// 학원장 시점에서 임시 진입 후 /stops/[id] 진입).

export default async function AdminStopsPage() {
  const stops = await db.stop.findMany({
    orderBy: [{ org: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      lat: true,
      lng: true,
      address: true,
      org: { select: { id: true, name: true } },
      _count: { select: { students: true, routes: true } },
    },
  });

  const mapStops = stops.map((s) => ({
    id: s.id,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    orgName: s.org.name,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">정류장</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          전체 학원·기관의 정류장 ({stops.length}개)을 한 지도에서 확인.
          마커는 줌 레벨에 따라 cluster.
        </p>
      </div>

      {/* 지도 */}
      <section>
        <AllStopsMap stops={mapStops} heightPx={480} />
      </section>

      {/* List */}
      <section className="bg-card rounded-lg border shadow-sm">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-extrabold tracking-tight">
            전체 정류장 list
          </h3>
        </div>
        <ul className="divide-y">
          {stops.length === 0 ? (
            <li className="text-muted-foreground p-4 text-sm">
              아직 등록된 정류장이 없습니다.
            </li>
          ) : (
            stops.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/admin/orgs/${s.org.id}`}
                  className="hover:bg-muted/40 flex items-center justify-between gap-3 px-4 py-3 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide">
                        {s.org.name}
                      </span>
                      <h3 className="text-sm font-extrabold tracking-tight">
                        {s.name}
                      </h3>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs font-medium">
                      {s.address ?? "주소 미등록"} · 학생 {s._count.students} ·
                      RouteStop {s._count.routes}
                    </p>
                  </div>
                  <span className="text-muted-foreground text-xs font-medium">
                    →
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
