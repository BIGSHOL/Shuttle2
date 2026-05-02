import { LoginForm } from "./login-form";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;
  return (
    <main className="bg-muted/40 flex min-h-screen items-center justify-center p-4">
      <LoginForm redirectTo={redirectTo} />
    </main>
  );
}
