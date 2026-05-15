import Link from "next/link";
import { Activity, ArrowUpRight, Coins, Sparkles, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-full space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Overview</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome back</h1>
          <p className="mt-1 text-muted-foreground">Realtime widgets wire up to your API + sockets — this is the premium shell.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="glow" size="sm">
            <Link href="/dashboard/requests?compose=1">New request</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/sessions">
              Sessions
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Active sessions", value: "12", delta: "+3 live", icon: Activity },
          { label: "Open requests", value: "48", delta: "Campus feed", icon: Users },
          { label: "AI matches / hr", value: "42", delta: "Reranked", icon: Sparkles },
          { label: "Credits earned", value: "1.2k", delta: "This week", icon: Coins },
        ].map((k) => (
          <Card key={k.label} className="border-border/70 bg-card/70 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
              <k.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.delta}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70 bg-card/70 backdrop-blur-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Activity timeline</CardTitle>
              <CardDescription>Socket-fed events appear here with optimistic inserts.</CardDescription>
            </div>
            <Badge variant="secondary">Live</Badge>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4 text-sm">
              {["Tutor Riley accepted your calculus doubt", "Session #482 entered whiteboard", "You earned +80 credits", "AI tagged your request: linear algebra"].map((t) => (
                <li key={t} className="flex gap-3 border-b border-border/40 pb-3 last:border-0 last:pb-0">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary shadow-glow" />
                  <span className="text-muted-foreground">{t}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Tutor matches</CardTitle>
            <CardDescription>Ranked tutors from live interest signals—same cards tighten when production embeddings ship.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {["Morgan · 4.9 · linear algebra", "Casey · 4.8 · teaching style match", "Dev · 4.7 · fastest reply"].map((t) => (
              <div key={t} className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm">
                {t}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
