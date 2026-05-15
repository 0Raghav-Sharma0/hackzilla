import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="w-full min-w-0">{children}</div>
    </AppShell>
  );
}
