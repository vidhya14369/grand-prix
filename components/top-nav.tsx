"use client"

import { useState } from "react"
import { Radio } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { drivers, sessions } from "@/lib/telemetry-data"

export function TopNav() {
  const [driver, setDriver] = useState("16")
  const [session, setSession] = useState("Q3")

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
            <Radio className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-pretty text-lg font-semibold leading-tight tracking-tight md:text-xl">
              Grand Prix Radio &amp; Telemetry Analytics
            </h1>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-calm opacity-70" />
                <span className="relative inline-flex size-2 rounded-full bg-calm" />
              </span>
              <p className="font-mono text-xs text-muted-foreground">
                System Ready &middot; HF Model Active
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={driver} onValueChange={setDriver}>
            <SelectTrigger className="w-[168px] font-mono text-sm">
              <SelectValue placeholder="Driver" />
            </SelectTrigger>
            <SelectContent>
              {drivers.map((d) => (
                <SelectItem key={d.id} value={d.id} className="font-mono">
                  {`#${d.id} · ${d.name}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={session} onValueChange={setSession}>
            <SelectTrigger className="w-[128px] font-mono text-sm">
              <SelectValue placeholder="Session" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((s) => (
                <SelectItem key={s} value={s} className="font-mono">
                  {`Session: ${s}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  )
}
