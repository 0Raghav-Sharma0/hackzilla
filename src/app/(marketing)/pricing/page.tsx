import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Pricing</h1>
      <p className="mt-4 text-muted-foreground">Early access framing — knowledge credits stay free for students; campuses and verified tutors anchor paid tiers.</p>
      <Button asChild className="mt-8">
        <Link href="/sign-up">Join waitlist</Link>
      </Button>
    </div>
  );
}
