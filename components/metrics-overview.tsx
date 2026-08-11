import { Clock, Gauge, TrendingUp, MapPin } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Kpi = {
  icon: React.ElementType
  label: string
  value: string
  sub: string
  tone?: "up" | "down" | "neutral"
}

const kpis: Kpi[] = [
  { icon: Clock, label: "Last Lap Time", value: "1:23.441", sub: "Lap 9 of 14", tone: "neutral" },
  { icon: TrendingUp, label: "Pace Delta", value: "+0.421s", sub: "vs. session best", tone: "down" },
  { icon: Gauge, label: "Stress Index", value: "84", sub: "High · rising", tone: "down" },
  { icon: MapPin, label: "Track Position", value: "P4", sub: "+1 since Lap 6", tone: "up" },
]

const toneColor = {
  up: "var(--calm)",
  down: "var(--stressed)",
  neutral: "var(--muted-foreground)",
} as const

export function MetricsOverview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Metrics Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="rounded-lg border border-border bg-background/50 p-4"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <k.icon className="size-4" aria-hidden="true" />
                <span className="text-xs">{k.label}</span>
              </div>
              <p className="mt-2 font-mono text-xl font-semibold tabular-nums tracking-tight">
                {k.value}
              </p>
              <p
                className="mt-0.5 font-mono text-[11px]"
                style={{ color: toneColor[k.tone ?? "neutral"] }}
              >
                {k.sub}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
