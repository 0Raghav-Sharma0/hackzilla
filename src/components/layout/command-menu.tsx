"use client";

import { useRouter } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Sparkles,
  Trophy,
  UserCircle,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

type CommandMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter();

  const run = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Navigate, act, or jump into a flow…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => run("/dashboard")}>
            <LayoutDashboard className="h-4 w-4" />
            Overview
            <CommandShortcut>⌘D</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run("/dashboard/requests")}>
            <MessageSquare className="h-4 w-4" />
            Live doubts feed
          </CommandItem>
          <CommandItem onSelect={() => run("/dashboard/sessions")}>
            <BookOpen className="h-4 w-4" />
            Sessions
          </CommandItem>
          <CommandItem onSelect={() => run("/dashboard/leaderboard")}>
            <Trophy className="h-4 w-4" />
            Leaderboard
          </CommandItem>
          <CommandItem onSelect={() => run("/dashboard/profile")}>
            <UserCircle className="h-4 w-4" />
            Profile & analytics
          </CommandItem>
          <CommandItem onSelect={() => run("/dashboard/ai")}>
            <Sparkles className="h-4 w-4" />
            AI co-pilot
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => run("/dashboard/requests?compose=1")}>
            <Plus className="h-4 w-4" />
            New help request
          </CommandItem>
          <CommandItem onSelect={() => run("/dashboard/requests")}>
            <MessageSquare className="h-4 w-4" />
            Browse tutor interest on open doubts
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="AI shortcuts">
          <CommandItem onSelect={() => run("/dashboard/ai")}>
            <Sparkles className="h-4 w-4" />
            Open momentum + roadmap
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
