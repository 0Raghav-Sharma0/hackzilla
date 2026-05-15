"use client";

import * as React from "react";
import { ShieldCheck, Mail } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { submitInstitutionVerificationEmail } from "@/features/trust/actions";

export function InstitutionVerificationCard({
  initialEmail,
  verifiedAt,
}: {
  initialEmail: string | null;
  verifiedAt: string | null;
}) {
  const qc = useQueryClient();
  const [email, setEmail] = React.useState(initialEmail ?? "");

  React.useEffect(() => {
    setEmail(initialEmail ?? "");
  }, [initialEmail]);

  const mut = useMutation({
    mutationFn: () => submitInstitutionVerificationEmail({ email }),
    onSuccess: () => {
      toast.success("Verification email saved — ops will confirm campus match.");
      void qc.invalidateQueries({ queryKey: ["profile-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (verifiedAt) {
    return (
      <Card className="border-emerald-500/25 bg-emerald-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Campus verification
          </CardTitle>
          <CardDescription>Institution email verified on {new Date(verifiedAt).toLocaleDateString()}.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (initialEmail) {
    return (
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-amber-400" />
            Verification pending
          </CardTitle>
          <CardDescription>
            Submitted <span className="font-mono text-foreground">{initialEmail}</span> — moderators confirm campus match (demo flow).
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4 text-primary" />
          Verify with school email
        </CardTitle>
        <CardDescription>Use your `.edu` or institutional address so we can anchor leaderboards and trust badges to your campus.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="inst-email">
            Institution email
          </label>
          <Input id="inst-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu" autoComplete="email" />
        </div>
        <Button type="button" variant="glow" disabled={mut.isPending || !email.trim()} onClick={() => mut.mutate()}>
          {mut.isPending ? "Saving…" : "Submit"}
        </Button>
      </CardContent>
    </Card>
  );
}
