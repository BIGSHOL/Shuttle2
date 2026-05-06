import { readFile } from "node:fs/promises";
import { join } from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Bus, GraduationCap, Users } from "lucide-react";

// 메뉴얼 ROLE 매핑.
// docs/manual/{file}을 server에서 read해 react-markdown으로 렌더.
// 스크린샷은 public/manual/screenshots/에 mirror돼 있음.
const MANUALS = {
  owner: {
    label: "학원장·원장",
    description: "셔틀 운영자 — 차량·정류장·노선·학생·직원·학부모 관리",
    file: "owner.md",
    Icon: GraduationCap,
  },
  driver: {
    label: "기사",
    description: "셔틀 운행 담당 — 운행 시작·정류장 통과·탑승·종료",
    file: "driver.md",
    Icon: Bus,
  },
  guardian: {
    label: "학부모",
    description: "자녀 셔틀 위치·결석·정류장 변경 관리",
    file: "guardian.md",
    Icon: Users,
  },
} as const;

type Role = keyof typeof MANUALS;
const DEFAULT_ROLE: Role = "owner";

function isRole(value: string | undefined): value is Role {
  return value === "owner" || value === "driver" || value === "guardian";
}

export default async function HelpPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role: roleParam } = await searchParams;
  const role: Role = isRole(roleParam) ? roleParam : DEFAULT_ROLE;
  const manual = MANUALS[role];

  let content: string;
  try {
    content = await readFile(
      join(process.cwd(), "docs/manual", manual.file),
      "utf-8",
    );
  } catch {
    notFound();
  }

  // 이미지 경로 변환: GitHub 미리보기에선 상대경로(`screenshots/...`),
  // web에선 absolute(/manual/screenshots/...).
  const transformed = content.replace(
    /\]\(screenshots\//g,
    "](/manual/screenshots/",
  );

  return (
    <div className="bg-background min-h-screen">
      {/* 상단 헤더 */}
      <header className="bg-card sticky top-0 z-10 border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 lg:px-6">
          <Link
            href="/"
            className="hover:text-foreground/80 flex items-center gap-2 text-sm font-bold tracking-tight"
          >
            <ArrowLeft className="text-muted-foreground h-4 w-4" />
            <span className="bg-bus text-bus-foreground flex h-7 w-7 items-center justify-center rounded-md shadow-sm">
              <Bus className="h-3.5 w-3.5" />
            </span>
            셔틀이
          </Link>
          <span className="text-muted-foreground text-xs font-medium">
            도움말
          </span>
        </div>
      </header>

      {/* 역할 탭 */}
      <div className="bg-card border-b">
        <div className="mx-auto max-w-5xl px-4 lg:px-6">
          <nav
            className="flex gap-1 overflow-x-auto"
            aria-label="역할별 메뉴얼"
          >
            {(Object.entries(MANUALS) as [Role, (typeof MANUALS)[Role]][]).map(
              ([key, m]) => {
                const active = key === role;
                const Icon = m.Icon;
                return (
                  <Link
                    key={key}
                    href={`/help?role=${key}`}
                    className={
                      active
                        ? "border-primary text-foreground inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-bold"
                        : "text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 py-3 text-sm font-medium"
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {m.label}
                  </Link>
                );
              },
            )}
          </nav>
        </div>
      </div>

      {/* 메뉴얼 본문 */}
      <main className="mx-auto max-w-3xl px-4 py-8 lg:px-6">
        <div className="bg-info-soft border-info/30 mb-6 rounded-lg border p-4">
          <p className="text-info text-xs font-extrabold tracking-wide uppercase">
            {manual.label} 메뉴얼
          </p>
          <p className="text-foreground mt-1 text-sm font-medium">
            {manual.description}
          </p>
        </div>

        <article>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: () => null, // 메뉴얼 최상단 h1은 상단 헤더가 대신함
              h2: ({ children }) => (
                <h2 className="mt-12 mb-4 border-b pb-2 text-2xl font-extrabold tracking-tight">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="mt-8 mb-2 text-lg font-bold tracking-tight">
                  {children}
                </h3>
              ),
              h4: ({ children }) => (
                <h4 className="mt-5 mb-2 text-base font-bold tracking-tight">
                  {children}
                </h4>
              ),
              p: ({ children }) => (
                <p className="my-3 leading-relaxed text-sm">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="my-3 ml-6 list-disc space-y-1.5 text-sm leading-relaxed">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="my-3 ml-6 list-decimal space-y-1.5 text-sm leading-relaxed">
                  {children}
                </ol>
              ),
              li: ({ children }) => <li>{children}</li>,
              strong: ({ children }) => (
                <strong className="font-bold">{children}</strong>
              ),
              img: (props) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={props.src as string}
                  alt={props.alt ?? ""}
                  className="my-5 w-full rounded-lg border shadow-sm"
                />
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-bus bg-muted/40 my-4 rounded-r-md border-l-4 px-4 py-3 text-sm">
                  {children}
                </blockquote>
              ),
              code: ({ children, className }) => {
                const isBlock = className?.startsWith("language-");
                if (isBlock) return <code className={className}>{children}</code>;
                return (
                  <code className="bg-muted rounded px-1 py-0.5 font-mono text-[0.875em]">
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => (
                <pre className="bg-muted my-4 overflow-x-auto rounded-md p-3 text-xs">
                  {children}
                </pre>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-info underline-offset-2 hover:underline"
                >
                  {children}
                </a>
              ),
              table: ({ children }) => (
                <div className="my-4 overflow-x-auto rounded-md border">
                  <table className="w-full border-collapse text-sm">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-muted/40">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="border-b px-3 py-2 text-left font-bold">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border-b px-3 py-2 align-top">{children}</td>
              ),
              hr: () => <hr className="my-8 border-border" />,
            }}
          >
            {transformed}
          </ReactMarkdown>
        </article>
      </main>

      <footer className="border-t py-6 text-center">
        <p className="text-muted-foreground text-xs font-medium">
          © 셔틀이 · 셔틀버스 운영 서비스
        </p>
      </footer>
    </div>
  );
}
