import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";

// W24: 가드는 src/app/admin/layout.tsx의 requireShuttleAdmin이 일괄 처리.
// 페이지 자체는 단순 데이터 조회만 — 마케팅 랜딩에서 들어온 베타 신청 목록
// (최근 100건).

const ORG_TYPE_LABEL = {
  ACADEMY: "학원·교습소",
  DAYCARE: "어린이집",
  KINDERGARTEN: "유치원",
} as const;

export default async function AdminPreRegistrationsPage() {
  const items = await db.preRegistration.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <main className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">사전등록 ({items.length})</h2>
        <p className="text-muted-foreground text-sm">
          마케팅 랜딩에서 들어온 베타 신청. 최신 100건.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">아직 없습니다</CardTitle>
            <CardDescription>
              랜딩 페이지가 외부에 노출되면 여기에 신청 내역이 쌓입니다.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{p.orgName}</CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      {ORG_TYPE_LABEL[p.orgType]}
                      {p.region ? ` · ${p.region}` : ""} ·{" "}
                      {p.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                <p>
                  <span className="text-muted-foreground">담당</span>{" "}
                  <span className="font-medium">{p.contact}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">이메일</span>{" "}
                  <a
                    href={`mailto:${p.email}`}
                    className="text-primary hover:underline"
                  >
                    {p.email}
                  </a>
                </p>
                <p>
                  <span className="text-muted-foreground">연락처</span>{" "}
                  {p.phone}
                </p>
                {p.notes ? (
                  <p className="text-muted-foreground mt-2 text-xs whitespace-pre-line">
                    메모: {p.notes}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
