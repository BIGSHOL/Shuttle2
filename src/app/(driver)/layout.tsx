import { requireDriver } from "@/lib/auth/session";

import { DriverHeader } from "./driver-header";

export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireDriver();

  return (
    <div className="bg-muted/40 min-h-screen">
      <DriverHeader
        orgName={user.org.name}
        role="DRIVER"
        email={user.email}
        staffName={user.staff.name}
      />
      {children}
    </div>
  );
}
