import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatCardsProps {
  stats: Array<{
    label: string;
    value: string;
    delta?: string;
    trend?: "up" | "down";
    icon?: React.ReactNode;
  }>;
}

/** KPI row for dashboards: revenue, bookings, open orders, active clients… */
export function StatCards({ stats }: StatCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              {s.icon && <span className="text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">{s.icon}</span>}
            </div>
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{s.value}</p>
            {s.delta && (
              <p
                className={cn(
                  "mt-1 flex items-center gap-1 text-xs",
                  s.trend === "down" ? "text-destructive" : "text-primary",
                )}
              >
                {s.trend === "down" ? (
                  <TrendingDown className="h-3.5 w-3.5" />
                ) : (
                  <TrendingUp className="h-3.5 w-3.5" />
                )}
                {s.delta}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
