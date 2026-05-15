"use client";

import { UserButton } from "@clerk/nextjs";
import { Menu, Moon, Search, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { NotificationDropdown } from "@/features/notifications/components/notification-dropdown";

type AppHeaderProps = {
  onMenuClick: () => void;
  onCommandClick: () => void;
};

export function AppHeader({ onMenuClick, onCommandClick }: AppHeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b-2 border-border bg-card/95 px-4 backdrop-blur-sm">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex flex-1 items-center gap-2">
        <Button
          variant="outline"
          className="relative h-9 w-full max-w-md justify-start rounded-lg border-border/60 bg-muted/30 text-muted-foreground shadow-none sm:pr-12"
          onClick={onCommandClick}
          type="button"
        >
          <Search className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">Search requests, tutors, commands…</span>
          <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border border-border/60 bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </div>
      <NotificationDropdown />
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute inset-0 m-auto h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </Button>
      <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "h-9 w-9" } }} />
    </header>
  );
}
