import type { ReactNode } from "react";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="border-b border-border/60 bg-card/30 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
          <p className="text-sm font-medium text-muted-foreground">Onboarding</p>
        </div>
      </div>
      <div className="flex flex-1 items-start justify-center px-4 py-10">
        <div className="w-full max-w-xl">{children}</div>
      </div>
    </div>
  );
}
