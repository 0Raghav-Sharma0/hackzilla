"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Bell, Check, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { markAllNotificationsRead, markNotificationRead, listNotifications } from "@/features/help-requests/actions";
import { useAdaptiveRefetchInterval } from "@/features/realtime/use-adaptive-refetch-interval";

export function NotificationDropdown() {
  const qc = useQueryClient();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const pollMs = useAdaptiveRefetchInterval(45_000);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(),
    refetchInterval: menuOpen ? pollMs : false,
    retry: 1,
  });

  const unread = data?.filter((n) => n.status === "UNREAD").length ?? 0;

  const readOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const readAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        setMenuOpen(open);
        if (open) void refetch();
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative touch-manipulation" aria-label="Notifications" aria-busy={isLoading}>
          <Bell className="h-5 w-5" aria-hidden />
          {unread > 0 ? (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(100vw-2rem,20rem)] border-border/70 bg-card/95 backdrop-blur-xl">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Notifications</span>
          <Button variant="ghost" size="sm" className="h-7 shrink-0 text-xs" disabled={readAll.isPending || unread === 0} onClick={() => void readAll.mutateAsync()}>
            {readAll.isPending ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : "Mark all read"}
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <div className="space-y-3 p-2" aria-busy>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2 rounded-lg border border-border/40 p-2">
                <Skeleton className="h-3 w-[55%]" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            <p>Couldn’t load inbox.</p>
            <Button type="button" variant="link" className="mt-2 h-auto p-0 text-primary" onClick={() => void refetch()} disabled={isFetching}>
              {isFetching ? "Retrying…" : "Tap to retry"}
            </Button>
          </div>
        ) : !data?.length ? (
          <div className="flex flex-col items-center px-4 py-8 text-center">
            <Inbox className="mb-2 h-9 w-9 text-muted-foreground/60" aria-hidden />
            <p className="text-sm font-medium text-foreground">You’re caught up</p>
            <p className="mt-1 text-xs text-muted-foreground">Matches, credits, and AI recaps land here in real time.</p>
          </div>
        ) : (
          data.slice(0, 12).map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="flex cursor-pointer flex-col items-start gap-1 py-3"
              onClick={() => {
                if (n.status === "UNREAD") void readOne.mutateAsync(n.id);
              }}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span className="text-sm font-medium leading-tight">{n.title}</span>
                {n.status === "UNREAD" ? (
                  <Badge variant="glow" className="shrink-0 text-[10px]">
                    New
                  </Badge>
                ) : (
                  <Check className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Read" />
                )}
              </div>
              <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
              {n.payload && typeof n.payload === "object" && "sessionId" in n.payload && typeof (n.payload as { sessionId?: string }).sessionId === "string" ? (
                <Link href={`/dashboard/sessions/${(n.payload as { sessionId: string }).sessionId}`} className="text-xs text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                  Open session
                </Link>
              ) : null}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
