"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  type DotProps,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { moodMeta, formatLapTime, type Mood, type LapData } from "@/lib/telemetry-data"

/* ── Member 4: Added stress dataset to chart config for dual-axis ── */
const chartConfig = {
  lapTime: {
    label: "Lap Time (s)",
    color: "var(--chart-1)",
  },
  stress: {
    label: "Stress Level (%)",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig

type MoodDotProps = DotProps & {
  payload?: { mood: Mood }
}

function MoodDot({ cx, cy, payload }: MoodDotProps) {
  if (cx == null || cy == null || !payload) return null
  const color = moodMeta[payload.mood].color
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill={color} opacity={0.2} />
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={color}
        stroke="var(--background)"
        strokeWidth={1.5}
      />
    </g>
  )
}

const legend: Mood[] = ["calm", "tired", "stressed"]

export function LapStressChart({ data }: { data: LapData[] }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-sm font-medium">
            Lap Time vs. Driver Stress
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Slower laps cluster with elevated vocal stress
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {legend.map((m) => (
            <div key={m} className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: moodMeta[m].color }}
                aria-hidden="true"
              />
              <span className="font-mono text-[11px] text-muted-foreground">
                {moodMeta[m].label}
              </span>
            </div>
          ))}
          {/* ── Member 4: Stress % legend item ── */}
          <div className="flex items-center gap-1.5">
            <span
              className="h-[2px] w-4 rounded-full"
              style={{ backgroundColor: "var(--chart-4)", opacity: 0.8 }}
              aria-hidden="true"
            />
            <span className="font-mono text-[11px] text-muted-foreground">
              Stress %
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="aspect-[16/10] w-full">
          <LineChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="lap"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => `L${v}`}
              className="font-mono"
            />
            {/* ── Member 4: Left Y-axis for Lap Time ── */}
            <YAxis
              yAxisId="left"
              domain={["dataMin - 0.4", "dataMax + 0.4"]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={48}
              tickFormatter={(v) => `${Number(v).toFixed(1)}s`}
              className="font-mono"
            />
            {/* ── Member 4: Right Y-axis for Stress % ── */}
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={40}
              tickFormatter={(v) => `${v}%`}
              className="font-mono"
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload as
                      | { lap: number; mood: Mood; stress: number }
                      | undefined
                    if (!p) return ""
                    return `Lap ${p.lap} · ${moodMeta[p.mood].label} (${p.stress}%)`
                  }}
                  /* ── Member 4: Updated formatter to handle both datasets ── */
                  formatter={(value, name) => (
                    <span className="font-mono tabular-nums text-foreground">
                      {name === "stress"
                        ? `${Number(value)}%`
                        : formatLapTime(Number(value))}
                    </span>
                  )}
                />
              }
            />
            <Line
              dataKey="lapTime"
              type="monotone"
              yAxisId="left"
              stroke="var(--color-lapTime)"
              strokeWidth={2}
              dot={<MoodDot />}
              activeDot={<MoodDot />}
            />
            {/* ── Member 4: Stress level line (dashed, neon red) ── */}
            <Line
              dataKey="stress"
              type="monotone"
              yAxisId="right"
              stroke="var(--color-stress)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4, fill: "var(--color-stress)" }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
