import { db } from "@/lib/db";

import { AddReleaseForm } from "./_components/add-release-form";
import { SetActiveButton } from "./_components/set-active-button";

// W24: 매니저 — 기사 RN 앱 APK 버전 관리.
// 활성 버전이 /api/driver-app/version 응답으로 사용됨.
// DB row가 없으면 ENV fallback (베타 동안 점진 이행).

export default async function AdminApkPage() {
  const releases = await db.driverAppRelease.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });
  const active = releases.find((r) => r.isActive);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">APK 관리</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          기사 RN 앱 버전. 활성으로 설정한 row가 모든 기사 폰의 다음 시작
          시점에 강제 업데이트 prompt로 발송됩니다.
        </p>
      </div>

      {/* 활성 버전 */}
      <section className="bg-card rounded-lg border p-5 shadow-sm">
        <p className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
          현재 활성 버전
        </p>
        {active ? (
          <div className="mt-2">
            <p className="text-foreground text-2xl font-extrabold tracking-tight">
              {active.version}
            </p>
            <a
              href={active.apkUrl}
              target="_blank"
              rel="noreferrer"
              className="text-info mt-1 break-all text-xs font-medium hover:underline"
            >
              {active.apkUrl}
            </a>
            {active.releaseNotes ? (
              <p className="text-muted-foreground mt-2 text-xs whitespace-pre-line">
                {active.releaseNotes}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-warning mt-2 text-sm font-medium">
            DB에 활성 버전 없음 — /api/driver-app/version은 ENV(DRIVER_APP_*)
            fallback 사용 중. 신 버전을 등록하세요.
          </p>
        )}
      </section>

      {/* 신 버전 등록 */}
      <section className="bg-card rounded-lg border p-5 shadow-sm">
        <h3 className="text-foreground mb-3 text-sm font-extrabold tracking-wide uppercase">
          신 버전 등록
        </h3>
        <AddReleaseForm />
      </section>

      {/* 과거 버전 list */}
      <section>
        <h3 className="text-foreground mb-2 text-sm font-extrabold tracking-wide uppercase">
          전체 release ({releases.length})
        </h3>
        <div className="bg-card rounded-lg border shadow-sm">
          {releases.length === 0 ? (
            <p className="text-muted-foreground p-4 text-sm">
              등록된 release가 없습니다.
            </p>
          ) : (
            <ul className="divide-y">
              {releases.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-foreground font-mono text-sm font-extrabold">
                        {r.version}
                      </span>
                      {r.isActive ? (
                        <span className="bg-bus-soft text-bus rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide">
                          활성
                        </span>
                      ) : null}
                      <span className="text-muted-foreground text-[11px] font-medium">
                        {r.createdAt.toISOString().slice(0, 10)}
                      </span>
                    </div>
                    <a
                      href={r.apkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-info mt-0.5 break-all text-xs font-medium hover:underline"
                    >
                      {r.apkUrl}
                    </a>
                    {r.releaseNotes ? (
                      <p className="text-muted-foreground mt-1 text-xs whitespace-pre-line">
                        {r.releaseNotes}
                      </p>
                    ) : null}
                  </div>
                  {!r.isActive ? (
                    <SetActiveButton id={r.id} version={r.version} />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
