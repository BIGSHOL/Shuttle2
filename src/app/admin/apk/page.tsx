import { db } from "@/lib/db";

import { AddReleaseForm } from "./_components/add-release-form";
import { EditReleaseForm } from "./_components/edit-release-form";
import { SetActiveButton } from "./_components/set-active-button";

// W24: 매니저 — 기사 앱(안드로이드 APK) 버전 관리.
// 활성 버전이 /api/driver-app/version 응답으로 사용됩니다.
// DB row가 없으면 환경 변수 fallback (베타 동안 점진 이행).

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
          기사 앱(안드로이드) 버전 관리. ‘활성’으로 설정한 버전이 모든 기사 폰의
          다음 앱 시작 시점에 강제 업데이트 안내로 표시됩니다.
        </p>
      </div>

      {/* 활성 버전 */}
      <section className="bg-card rounded-lg border p-5 shadow-sm">
        <p className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
          현재 활성 버전
        </p>
        {active ? (
          <div className="mt-2 space-y-2">
            <p className="text-foreground text-2xl font-extrabold tracking-tight">
              {active.version}
            </p>
            <a
              href={active.apkUrl}
              target="_blank"
              rel="noreferrer"
              className="text-info block break-all text-xs font-medium hover:underline"
            >
              {active.apkUrl}
            </a>
            <ApkMetaRow
              sha256={active.sha256}
              fileSizeBytes={active.fileSizeBytes}
            />
            {active.releaseNotes ? (
              <p className="text-muted-foreground mt-2 text-xs whitespace-pre-line">
                {active.releaseNotes}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-warning mt-2 text-sm font-medium">
            DB에 활성 버전이 없습니다 — 환경 변수 fallback을 사용 중입니다. 새
            버전을 등록하세요.
          </p>
        )}
      </section>

      {/* 새 버전 등록 */}
      <section className="bg-card rounded-lg border p-5 shadow-sm">
        <h3 className="text-foreground mb-3 text-sm font-extrabold tracking-wide uppercase">
          새 버전 등록
        </h3>
        <AddReleaseForm />
      </section>

      {/* 과거 버전 목록 */}
      <section>
        <h3 className="text-foreground mb-2 text-sm font-extrabold tracking-wide uppercase">
          전체 배포 ({releases.length})
        </h3>
        <div className="bg-card rounded-lg border shadow-sm">
          {releases.length === 0 ? (
            <p className="text-muted-foreground p-4 text-sm">
              등록된 배포가 없습니다.
            </p>
          ) : (
            <ul className="divide-y">
              {releases.map((r) => (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
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
                      <div className="mt-1">
                        <ApkMetaRow
                          sha256={r.sha256}
                          fileSizeBytes={r.fileSizeBytes}
                        />
                      </div>
                      {r.releaseNotes ? (
                        <p className="text-muted-foreground mt-1 text-xs whitespace-pre-line">
                          {r.releaseNotes}
                        </p>
                      ) : null}
                    </div>
                    {!r.isActive ? (
                      <SetActiveButton id={r.id} version={r.version} />
                    ) : null}
                  </div>
                  <div className="mt-2">
                    <EditReleaseForm
                      id={r.id}
                      version={r.version}
                      defaultApkUrl={r.apkUrl}
                      defaultReleaseNotes={r.releaseNotes}
                      defaultSha256={r.sha256}
                      defaultFileSizeBytes={r.fileSizeBytes}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function ApkMetaRow({
  sha256,
  fileSizeBytes,
}: {
  sha256: string | null;
  fileSizeBytes: number | null;
}) {
  if (!sha256 && !fileSizeBytes) return null;
  return (
    <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] font-medium">
      {sha256 ? (
        <span className="break-all">
          <span className="text-foreground font-bold">SHA256</span>{" "}
          <code className="font-mono">{sha256}</code>
        </span>
      ) : null}
      {fileSizeBytes ? (
        <span>
          <span className="text-foreground font-bold">파일 크기</span>{" "}
          {formatBytes(fileSizeBytes)}
        </span>
      ) : null}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${bytes} B`;
}
