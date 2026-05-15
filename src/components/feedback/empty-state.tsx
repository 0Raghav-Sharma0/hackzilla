import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { springSoft } from "@/animations/variants";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description: string;
  className?: string;
  children?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, className, children }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/50 px-6 py-12 text-center shadow-card backdrop-blur-sm",
        className,
      )}
    >
      {Icon ? (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/50 bg-muted/30">
          <Icon className="h-7 w-7 text-muted-foreground" aria-hidden />
        </div>
      ) : null}
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      {children ? <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{children}</div> : null}
    </motion.div>
  );
}
