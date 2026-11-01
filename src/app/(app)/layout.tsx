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

  // Fetch active overlap count for sidebar pill badge
  const activeOverlapCount = await db.overlapGroup.count({
    where: {
      ...overlapScope(session),
      status: "OPEN",
    },
  });

  // Fetch unread alerts count for topbar notification bell
  const unreadAlertsCount = await db.alert.count({
    where: {
      ...alertScope(session),
      isRead: false,
    },
  });

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

