import type { ReactNode } from "react";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <DashboardTabs />
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</div>
    </div>
  );
}
