import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { overlapScope, alertScope } from "@/lib/rbac";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  let activeOverlapCount = 0;
  let unreadAlertsCount = 0;

  try {
    activeOverlapCount = await db.overlapGroup.count({
      where: {
        ...overlapScope(session),
        status: "OPEN",
      },
    });
  } catch (err) {
    console.error("AppLayout: failed to fetch activeOverlapCount:", err);
  }

  try {
    unreadAlertsCount = await db.alert.count({
      where: {
        ...alertScope(session),
        isRead: false,
      },
    });
  } catch (err) {
    console.error("AppLayout: failed to fetch unreadAlertsCount:", err);
  }

  return (
    <AppShell
      user={session}
      activeOverlapCount={activeOverlapCount}
      unreadAlertsCount={unreadAlertsCount}
    >
      {children}
    </AppShell>
  );
}
