import { Clock, Gauge, TrendingUp, Trophy } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatLapTime, type LapData } from "@/lib/telemetry-data"

type Kpi = {
  icon: React.ElementType
  label: string
  value: string
  sub: string
  tone?: "up" | "down" | "neutral"
}

const toneColor = {
  up: "var(--calm)",
  down: "var(--stressed)",
  neutral: "var(--muted-foreground)",
} as const

export function MetricsOverview({ laps }: { laps: LapData[] }) {
  const latestLap = laps.length > 0 ? laps[laps.length - 1] : null
  const bestLap = laps.length > 0 
    ? laps.reduce((prev, curr) => (prev.lapTime < curr.lapTime ? prev : curr), laps[0]) 
    : null

  // 1. Last Lap Time
  const lastLapValue = latestLap ? formatLapTime(latestLap.lapTime) : "—"
  const lastLapSub = latestLap ? `Lap ${latestLap.lap} of ${laps.length}` : "No stints logged"

  // 2. Pace Delta
  let deltaValue = "0.000s"
  let deltaSub = "Baseline set"
  let deltaTone: "up" | "down" | "neutral" = "neutral"

  if (laps.length > 1 && latestLap && bestLap) {
    const delta = latestLap.lapTime - bestLap.lapTime
    if (latestLap.lap === bestLap.lap) {
      deltaValue = "0.000s"
      deltaSub = "Stint Best pace"
      deltaTone = "up"
    } else if (delta > 0) {
      deltaValue = `+${delta.toFixed(3)}s`
      deltaSub = `vs. stint best (L${bestLap.lap})`
      deltaTone = "down"
    } else {
      deltaValue = `${delta.toFixed(3)}s`
      deltaSub = "New stint best!"
      deltaTone = "up"
    }
  }

  // 3. Stress Index
  const stressValue = latestLap ? `${latestLap.stress}%` : "—"
  let stressSub = "No telemetry"
  let stressTone: "up" | "down" | "neutral" = "neutral"

  if (latestLap) {
    if (latestLap.stress > 60) {
      stressSub = "High · rising"
      stressTone = "down"
    } else if (latestLap.stress > 30) {
      stressSub = "Elevated · alert"
      stressTone = "neutral"
    } else {
      stressSub = "Low · stable"
      stressTone = "up"
    }
  }

  // 4. Stint Best
  const bestValue = bestLap ? formatLapTime(bestLap.lapTime) : "—"
  const bestSub = bestLap ? `Set on Lap ${bestLap.lap}` : "No stints logged"

  const kpis: Kpi[] = [
    { icon: Clock, label: "Last Lap Time", value: lastLapValue, sub: lastLapSub, tone: "neutral" },
    { icon: TrendingUp, label: "Pace Delta", value: deltaValue, sub: deltaSub, tone: deltaTone },
    { icon: Gauge, label: "Stress Index", value: stressValue, sub: stressSub, tone: stressTone },
    { icon: Trophy, label: "Stint Best", value: bestValue, sub: bestSub, tone: "up" },
  ]

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
