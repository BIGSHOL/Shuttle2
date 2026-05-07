import { LoginForm } from "./login-form";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; suspended?: string }>;
}) {
  const { redirectTo, suspended } = await searchParams;
  return (
    <main className="bg-muted/40 flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-3">
        {suspended === "1" ? (
          <div
            role="alert"
            className="border-warning/50 bg-warning-soft text-warning rounded-md border p-3 text-sm font-medium"
          >
            현재 운영이 중단된 학원·기관입니다. 셔틀이 운영팀 또는 학원에
            문의해 주세요.
          </div>
        ) : null}
        <LoginForm redirectTo={redirectTo} />
      </div>
    </main>
  );
}
