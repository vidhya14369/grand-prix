"use client"

import { Activity, AlertTriangle, BatteryLow, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type Mood, moodMeta } from "@/lib/telemetry-data"

const icons = {
  calm: CheckCircle2,
  tired: BatteryLow,
  stressed: AlertTriangle,
} as const

const levelLabel = (stress: number) =>
  stress >= 70 ? "High Stress" : stress >= 45 ? "Elevated" : "Low Stress"

export function MoodBadgeCard({
  mood,
  stress,
}: {
  mood: Mood
  stress: number
}) {
  const meta = moodMeta[mood]
  const Icon = icons[mood]

  return (
    <Card
      className="relative overflow-hidden"
      style={{
        borderColor: `color-mix(in oklch, ${meta.color} 45%, transparent)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24"
        style={{
          background: `radial-gradient(120% 100% at 50% 0%, color-mix(in oklch, ${meta.color} 22%, transparent), transparent 70%)`,
        }}
        aria-hidden="true"
      />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Activity className="size-4 text-primary" aria-hidden="true" />
          Driver Mood &amp; Stress
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex items-center gap-4">
          <div
            className="flex size-16 shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: `color-mix(in oklch, ${meta.color} 18%, transparent)`,
              color: meta.color,
              boxShadow: `0 0 0 1px color-mix(in oklch, ${meta.color} 40%, transparent)`,
            }}
          >
            <Icon className="size-8" aria-hidden="true" />
          </div>
          <div>
            <p
              className="text-3xl font-semibold leading-none tracking-tight"
              style={{ color: meta.color }}
            >
              {meta.label}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {meta.description}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Stress Level
            </span>
            <span className="font-mono text-sm tabular-nums">
              <span className="font-semibold" style={{ color: meta.color }}>
                {stress}%
              </span>{" "}
              <span className="text-muted-foreground">· {levelLabel(stress)}</span>
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${stress}%`,
                backgroundColor: meta.color,
                boxShadow: `0 0 12px color-mix(in oklch, ${meta.color} 60%, transparent)`,
              }}
            />
          </div>
          <p className="font-mono text-[11px] text-muted-foreground">
            Confidence {Math.min(99, stress + 8)}% · HF speech-emotion model
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
