import Link from "next/link";

import type { Prisma } from "@/generated/prisma/client";

import { db } from "@/lib/db";

import { AllStopsMap } from "./_components/all-stops-map";

// W24: 매니저 — 전체 학원의 정류장 통합 지도 + 목록.
// 각 정류장 행 → /admin/orgs/[orgId] 학원 상세로 이동 (정류장 자체 상세는
// 학원장 시점 임시 진입 후 /stops/[id]에서 확인).
// 검색(이름·주소)·학원 필터.

export default async function AdminStopsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; orgId?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const orgIdFilter = sp.orgId && sp.orgId !== "all" ? sp.orgId : null;

  const where: Prisma.StopWhereInput = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { address: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(orgIdFilter ? { orgId: orgIdFilter } : {}),
  };

  const [stops, allOrgs] = await Promise.all([
    db.stop.findMany({
      where,
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
    }),
    db.organization.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

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
          전체 학원·기관의 정류장 ({stops.length}개)을 한 지도에서 확인. 마커는
          줌 레벨에 따라 묶여서 표시됩니다.
        </p>
      </div>

      {/* 검색·필터 */}
      <form
        action="/admin/stops"
        className="bg-card flex flex-wrap gap-2 rounded-lg border p-3 shadow-sm"
      >
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="정류장 이름·주소"
          className="bg-card border-input min-w-40 flex-1 rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <select
          name="orgId"
          defaultValue={orgIdFilter ?? "all"}
          className="bg-card border-input rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="all">전체 학원</option>
          {allOrgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-bold"
        >
          검색
        </button>
        {(q || orgIdFilter) && (
          <Link
            href="/admin/stops"
            className="text-muted-foreground hover:text-foreground inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium"
          >
            초기화
          </Link>
        )}
      </form>

      {/* 지도 */}
      <section>
        <AllStopsMap stops={mapStops} heightPx={480} />
      </section>

      {/* 목록 */}
      <section className="bg-card rounded-lg border shadow-sm">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-extrabold tracking-tight">
            전체 정류장 목록
          </h3>
        </div>
        <ul className="divide-y">
          {stops.length === 0 ? (
            <li className="text-muted-foreground p-4 text-sm">
              조건에 맞는 정류장이 없습니다.
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
                      {s.address ?? "주소 미등록"} · 학생 {s._count.students}명
                      · 노선 사용 {s._count.routes}건
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
