import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft } from "lucide-react";

import { db } from "@/lib/db";

import { UserActionButtons } from "../../_components/user-action-buttons";

const STAFF_ROLE_LABEL = {
  OWNER: "학원장",
  DRIVER: "기사",
  HELPER: "동승자",
} as const;

// W24: 매니저 — 사용자 1명 detail. STAFF 또는 GUARDIAN.
export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind: kindRaw, id } = await params;
  if (kindRaw !== "STAFF" && kindRaw !== "GUARDIAN") notFound();
  const kind = kindRaw as "STAFF" | "GUARDIAN";

  if (kind === "STAFF") {
    const s = await db.staff.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        role: true,
        loginId: true,
        phone: true,
        recoveryEmail: true,
        userId: true,
        org: { select: { id: true, name: true } },
      },
    });
    if (!s) notFound();
    return renderProfile({
      kind: "STAFF",
      id: s.id,
      name: s.name,
      subTitle: `${STAFF_ROLE_LABEL[s.role]} · ${s.org.name}`,
      orgLink: { id: s.org.id, label: `${s.org.name} 360°` },
      info: [
        { label: "로그인 아이디", value: s.loginId ?? "—" },
        { label: "전화", value: s.phone },
        { label: "recoveryEmail", value: s.recoveryEmail ?? "미등록" },
        { label: "Auth user", value: s.userId ?? "미가입" },
      ],
      recoveryEmail: s.recoveryEmail,
    });
  }

  const g = await db.guardian.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      loginId: true,
      phone: true,
      recoveryEmail: true,
      userId: true,
      links: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              org: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
  if (!g) notFound();

  const childList = g.links.map((l) => ({
    id: l.student.id,
    name: l.student.name,
    orgName: l.student.org.name,
  }));

  return renderProfile({
    kind: "GUARDIAN",
    id: g.id,
    name: g.name,
    subTitle: `학부모 · 자녀 ${childList.length}명`,
    info: [
      { label: "로그인 아이디", value: g.loginId ?? "—" },
      { label: "전화", value: g.phone },
      { label: "recoveryEmail", value: g.recoveryEmail ?? "미등록" },
      { label: "Auth user", value: g.userId ?? "미가입" },
      {
        label: "자녀",
        value:
          childList.length > 0
            ? childList.map((c) => `${c.name} (${c.orgName})`).join(", ")
            : "—",
      },
    ],
    recoveryEmail: g.recoveryEmail,
  });
}

function renderProfile(p: {
  kind: "STAFF" | "GUARDIAN";
  id: string;
  name: string;
  subTitle: string;
  info: { label: string; value: string }[];
  recoveryEmail: string | null;
  orgLink?: { id: string; label: string };
}) {
  return (
    <div className="space-y-5">
      <Link
        href="/admin/users"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        사용자 list로
      </Link>

      <div className="bg-card rounded-lg border p-5 shadow-sm">
        <h2 className="text-xl font-extrabold tracking-tight">{p.name}</h2>
        <p className="text-muted-foreground mt-1.5 text-sm font-medium">
          {p.subTitle}
        </p>
        {p.orgLink ? (
          <Link
            href={`/admin/orgs/${p.orgLink.id}`}
            className="text-info mt-2 inline-block text-xs font-bold hover:underline"
          >
            → {p.orgLink.label}
          </Link>
        ) : null}
      </div>

      <div className="bg-card rounded-lg border p-5 shadow-sm">
        <h3 className="text-foreground mb-3 text-sm font-extrabold tracking-wide uppercase">
          기본 정보
        </h3>
        <dl className="grid grid-cols-1 gap-2 text-sm lg:grid-cols-2">
          {p.info.map((i) => (
            <div key={i.label}>
              <dt className="text-muted-foreground text-[11px] font-bold uppercase">
                {i.label}
              </dt>
              <dd className="text-foreground mt-0.5 break-words font-medium">
                {i.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="bg-card rounded-lg border p-5 shadow-sm">
        <h3 className="text-foreground mb-3 text-sm font-extrabold tracking-wide uppercase">
          매니저 액션
        </h3>
        <UserActionButtons
          kind={p.kind}
          id={p.id}
          name={p.name}
          recoveryEmail={p.recoveryEmail}
        />
      </div>
    </div>
  );
}
