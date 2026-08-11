"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Pause, Play, UploadCloud, Waves, Loader2, Radio, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { radioPresets, moodMeta, type RadioClip } from "@/lib/telemetry-data"

// Deterministic pseudo-random bar heights for the simulated waveform.
function useWaveform(count: number, seedBase: number) {
  return useMemo(() => {
    const bars: number[] = []
    let seed = seedBase
    for (let i = 0; i < count; i++) {
      seed = (seed * 9301 + 49297) % 233280
      const rnd = seed / 233280
      // Envelope so the middle is louder, like a real radio burst.
      const envelope = Math.sin((i / count) * Math.PI)
      bars.push(0.2 + rnd * 0.8 * (0.4 + envelope))
    }
    return bars
  }, [count, seedBase])
}

type Tab = "preset" | "upload"

export function AudioPlayerCard({
  clip,
  onSelectClip,
  onAnalyze,
  analyzing,
}: {
  clip: RadioClip
  onSelectClip: (clip: RadioClip, file?: File) => void
  onAnalyze: () => void
  analyzing: boolean
}) {
  const [tab, setTab] = useState<Tab>("preset")
  const [dragActive, setDragActive] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0) // seconds
  const inputRef = useRef<HTMLInputElement>(null)

  // Reseed the waveform per clip so each radio call looks distinct.
  const seedBase = useMemo(() => {
    let s = 0
    for (const c of clip.id) s = (s * 31 + c.charCodeAt(0)) % 233280
    return s + 7
  }, [clip.id])
  const bars = useWaveform(64, seedBase)

  const duration = clip.duration

  // Reset transport when the loaded clip changes.
  useEffect(() => {
    setProgress(0)
    setPlaying(false)
  }, [clip.id])

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setProgress((p) => {
        if (p >= duration) {
          setPlaying(false)
          return duration
        }
        return +(p + 0.1).toFixed(1)
      })
    }, 100)
    return () => window.clearInterval(id)
  }, [playing, duration])

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    // Build a synthetic clip from the uploaded file for testing.
    onSelectClip({
      id: `custom-${file.name}`,
      lap: 0,
      label: "Custom",
      timestamp: "—",
      duration: 14,
      fileName: file.name,
      mood: "tired",
      stress: 52,
      clipTime: "00:00",
      speaker: "Custom Upload",
      transcript:
        "Custom audio loaded. Run analysis to detect vocal stress and generate a transcript for this clip.",
    }, file)
  }

  const pct = (progress / duration) * 100
  const activeBar = Math.floor((progress / duration) * bars.length)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Waves className="size-4 text-primary" aria-hidden="true" />
          Audio Input &amp; Player
        </CardTitle>
        <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          .wav / .mp3
        </span>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tab toggle */}
        <div
          className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-background/60 p-1"
          role="tablist"
          aria-label="Audio source"
        >
          <TabButton active={tab === "preset"} onClick={() => setTab("preset")} icon={Radio}>
            Select Historical Radio
          </TabButton>
          <TabButton active={tab === "upload"} onClick={() => setTab("upload")} icon={UploadCloud}>
            Upload Custom File
          </TabButton>
        </div>

        {/* Tab content */}
        {tab === "preset" ? (
          <div className="space-y-2" role="tabpanel" aria-label="Historical radio clips">
            {radioPresets.map((preset) => {
              const selected = preset.id === clip.id
              const meta = moodMeta[preset.mood]
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectClip(preset)}
                  aria-pressed={selected}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary/40 hover:border-primary/50 hover:bg-secondary/70"
                  }`}
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-md font-mono text-xs font-semibold ${
                      selected ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                    }`}
                  >
                    L{preset.lap}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      Lap {preset.lap} &middot; {preset.label}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                      <Clock className="size-3" aria-hidden="true" />
                      {preset.timestamp}
                    </span>
                  </span>

                  {/* Driver state preview badge — shown once selected/loaded */}
                  {selected && (
                    <span
                      className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide"
                      style={{
                        color: meta.color,
                        backgroundColor: `color-mix(in oklch, ${meta.color} 18%, transparent)`,
                      }}
                    >
                      <span className="size-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                      {meta.label}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          <div role="tabpanel" aria-label="Custom file upload">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragActive(false)
                handleFiles(e.dataTransfer.files)
              }}
              className={`flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary/40 hover:border-primary/50 hover:bg-secondary/70"
              }`}
            >
              <UploadCloud className="size-6 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm text-foreground">
                Drop radio clip here or <span className="text-primary">browse</span>
              </span>
              <span className="font-mono text-xs text-muted-foreground">{clip.fileName}</span>
              <input
                ref={inputRef}
                type="file"
                accept=".wav,.mp3,audio/*"
                className="sr-only"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </button>
          </div>
        )}

        {/* Waveform + transport (shared across tabs) */}
        <div className="rounded-lg border border-border bg-background/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-xs text-muted-foreground">{clip.fileName}</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {clip.lap ? `Lap ${clip.lap}` : "Custom"}
            </span>
          </div>

          <div className="flex h-20 items-center gap-[3px]" aria-hidden="true">
            {bars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-full transition-colors"
                style={{
                  height: `${Math.max(8, h * 100)}%`,
                  backgroundColor:
                    i <= activeBar && playing
                      ? "var(--primary)"
                      : i <= activeBar
                        ? "color-mix(in oklch, var(--primary) 55%, transparent)"
                        : "var(--muted)",
                }}
              />
            ))}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <Button
              size="icon"
              variant="secondary"
              className="size-9 shrink-0 rounded-full"
              onClick={() => {
                if (progress >= duration) setProgress(0)
                setPlaying((p) => !p)
              }}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </Button>

            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-100 ease-linear"
                style={{ width: `${pct}%` }}
              />
            </div>

            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {formatClock(progress)} / {formatClock(duration)}
            </span>
          </div>
        </div>

        <Button className="w-full font-medium" onClick={onAnalyze} disabled={analyzing}>
          {analyzing ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Analyzing radio call…
            </>
          ) : (
            <>
              <Waves className="size-4" />
              Analyze Radio Call
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Radio
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      <span className="truncate">{children}</span>
    </button>
  )
}

function formatClock(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, "0")}`
}
