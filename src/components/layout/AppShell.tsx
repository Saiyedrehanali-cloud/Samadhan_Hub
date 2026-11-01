"use client";

import { useState } from "react";
import { SessionUser } from "@/lib/auth";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface AppShellProps {
  user: SessionUser;
  activeOverlapCount?: number;
  unreadAlertsCount?: number;
  children: React.ReactNode;
}

export function AppShell({
  user,
  activeOverlapCount = 0,
  unreadAlertsCount = 0,
  children,
}: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Sidebar (Desktop fixed, Mobile drawer) */}
      <Sidebar
        user={user}
        activeOverlapCount={activeOverlapCount}
        isOpenMobile={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div className="md:pl-[232px] flex flex-col min-h-screen">
        <Topbar
          user={user}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          unreadAlertsCount={unreadAlertsCount}
        />
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

