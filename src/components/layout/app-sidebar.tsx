"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Command, LayoutDashboard, MessageSquare, Sparkles, Trophy, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Logo } from "@/components/brand/logo";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/requests", label: "Requests", icon: MessageSquare },
  { href: "/dashboard/sessions", label: "Sessions", icon: BookOpen },
  { href: "/dashboard/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
  { href: "/dashboard/ai", label: "AI insights", icon: Sparkles },
];

export function AppSidebar({ onNavigate, onCommandOpen }: { onNavigate?: () => void; onCommandOpen?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    for (const { href } of nav) {
      router.prefetch(href);
    }
  }, [router]);

  return (
    <aside className="flex h-full w-[260px] flex-col border-r-2 border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b-2 border-sidebar-border px-4">
        <Logo />
      </div>
      <ScrollArea className="flex-1 py-3">
        <nav className="flex flex-col gap-0.5 px-2">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link key={href} href={href} onClick={onNavigate}>
                <span
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border border-primary/25 bg-primary/12 text-foreground"
                      : "text-sidebar-foreground hover:border hover:border-transparent hover:bg-primary/8 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-80" />
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 border-border/60 bg-background/30 text-muted-foreground"
          type="button"
          onClick={onCommandOpen}
        >
          <Command className="h-4 w-4" />
          Command
          <kbd className="ml-auto hidden rounded bg-muted px-1.5 font-mono text-[10px] sm:inline">⌘K</kbd>
        </Button>
      </div>
    </aside>
  );
}
