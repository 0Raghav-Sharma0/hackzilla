import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/30 py-14">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">Learn. Teach. Grow together. Peer learning that feels instant, fair, and alive.</p>
        </div>
        <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
          <div className="space-y-3">
            <p className="font-medium text-foreground">Product</p>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="#features" className="hover:text-foreground">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-foreground">
                  App
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <p className="font-medium text-foreground">Legal</p>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <span className="cursor-not-allowed opacity-60">Privacy</span>
              </li>
              <li>
                <span className="cursor-not-allowed opacity-60">Terms</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <p className="mt-10 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} LearnLoop. Demo foundation.</p>
    </footer>
  );
}
