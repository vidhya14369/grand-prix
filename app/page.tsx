"use client"

import { useState, useEffect } from "react"
import { TopNav } from "@/components/top-nav"
import { AudioPlayerCard } from "@/components/audio-player-card"
import { MoodBadgeCard } from "@/components/mood-badge-card"
import { TranscriptCard } from "@/components/transcript-card"
import { MetricsOverview } from "@/components/metrics-overview"
import { LapStressChart } from "@/components/lap-stress-chart"
/* ── Member 4: Added formatLapTime import for session table ── */
import { currentAnalysis, formatLapTime, type RadioClip, type LapData } from "@/lib/telemetry-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Cpu, AlertTriangle, Sparkles } from "lucide-react"

export default function Page() {
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzed, setAnalyzed] = useState(true)
  const [clip, setClip] = useState<RadioClip>(currentAnalysis)
  const [uploadedFile, setUploadedFile] = useState<File | undefined>(undefined)
  const [sessionLaps, setSessionLaps] = useState<LapData[]>([])
  const [insights, setInsights] = useState<string>("Analyzing stint pace... Run AI analysis on the driver's radio to compute performance delta.")
  const [isFallbackMode, setIsFallbackMode] = useState<boolean>(false)

  // Sync data on page load
  useEffect(() => {
    fetchSessionData()
  }, [])

  async function fetchSessionData() {
    try {
      const res = await fetch("http://localhost:8000/api/session")
      if (res.ok) {
        const data = await res.json()
        setSessionLaps(data)
        setIsFallbackMode(false)
      } else {
        throw new Error("API error")
      }

      try {
        const insightsRes = await fetch("http://localhost:8000/api/session/insights")
        if (insightsRes.ok) {
          const insightsData = await insightsRes.json()
          setInsights(insightsData.advisory_message)
        }
      } catch (insightsErr) {
        console.warn("Insights endpoint failed, keeping AI status active:", insightsErr)
      }
    } catch (e) {
      console.warn("FastAPI backend offline, loading local static telemetry mock data...")
      setIsFallbackMode(true)
      const { lapData } = await import("@/lib/telemetry-data")
      setSessionLaps(lapData)
      setInsights("Driver vocal stress exceeded 70% during Lap 9. Coincided with a +2.1s pace drop. Recommend tire change (Slicks to Intermediates).")
    }
  }

  function handleSelectClip(next: RadioClip, file?: File) {
    setClip(next)
    setUploadedFile(file)
    setAnalyzed(false) // Wait for user to trigger explicit analysis
  }

  async function handleAnalyze(customLapNum: number, customLapTimeStr: string) {
    setAnalyzing(true)
    
    // Determine if it's a custom upload or preset
    const isCustom = clip.id.startsWith("custom-")
    
    try {
      let resultData;
      
      if (isCustom) {
        // Prepare multipart form data for file upload
        const formData = new FormData()
        if (uploadedFile) {
          formData.append("file", uploadedFile)
        }
        
        const parsedSeconds = parseTimeToSeconds(customLapTimeStr) || 82.4
        formData.append("lap", customLapNum.toString())
        formData.append("lapTime", parsedSeconds.toString())
        
        const res = await fetch("http://localhost:8000/api/predict", {
          method: "POST",
          body: formData,
        })
        
        if (!res.ok) throw new Error("Backend failed processing file")
        resultData = await res.json()
        setIsFallbackMode(false)

        // Explicitly save the custom lap to the backend session log database
        try {
          await fetch("http://localhost:8000/api/session/add", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              lap: resultData.lap,
              lapTime: resultData.lapTime,
              mood: resultData.mood,
              stress: resultData.stress,
              transcript: resultData.transcript,
              speaker: resultData.speaker || "Driver Radio"
            })
          })
        } catch (saveErr) {
          console.warn("Manual save call to /api/session/add failed:", saveErr)
        }
      } else {
        // Preset file execution (passes IDs only to trigger local backend file processing)
        const formData = new FormData()
        formData.append("preset_id", clip.id)
        formData.append("filename", clip.fileName)
        formData.append("lap", clip.lap.toString())
        
        // Find existing preset lapTime or assign default
        const { lapData } = await import("@/lib/telemetry-data")
        const presetLap = lapData.find(l => l.lap === clip.lap)
        const lapTime = presetLap ? presetLap.lapTime : 82.0
        formData.append("lapTime", lapTime.toString())
        
        const res = await fetch("http://localhost:8000/api/predict/preset", {
          method: "POST",
          body: formData,
        })
        
        if (!res.ok) throw new Error("Backend failed processing preset")
        resultData = await res.json()
        setIsFallbackMode(false)
      }
      
      // Update clip UI view
      setClip({
        ...clip,
        mood: resultData.mood,
        stress: resultData.stress,
        transcript: resultData.transcript,
        lap: resultData.lap
      })
      
      // Refresh session logs and insights
      await fetchSessionData()
      setAnalyzed(true)
      
    } catch (err) {
      console.error("Inference fetch failed, executing local mock timeout:", err)
      setIsFallbackMode(true)
      // Local Mock fallback in case backend is offline
      await new Promise(resolve => setTimeout(resolve, 1200))
      
      const parsedSeconds = parseTimeToSeconds(customLapTimeStr) || 82.4
      
      // Fallback update
      const updatedClip = {
        ...clip,
        transcript: clip.transcript || "Copy that, tyres feel completely gone. I am losing the rear.",
        mood: clip.mood || "stressed",
        stress: clip.stress || 84,
        lap: isCustom ? customLapNum : clip.lap
      }
      setClip(updatedClip)

      /* ── Update local chart data even when backend is offline ── */
      if (isCustom) {
        const fallbackLap: LapData = {
          lap: customLapNum,
          lapTime: parsedSeconds,
          mood: updatedClip.mood,
          stress: updatedClip.stress,
        }
        setSessionLaps(prev => [...prev, fallbackLap].sort((a, b) => a.lap - b.lap))
      }

      setAnalyzed(true)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen">
      <TopNav />

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
              The Silent Co-Driver
            </p>
            <h2 className="mt-1 text-balance text-2xl font-semibold tracking-tight">
              Radio &amp; Stress Analytics
            </h2>
          </div>
          {isFallbackMode ? (
            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-mono text-[10px] uppercase text-amber-400">
              <Cpu className="size-3.5 animate-pulse" />
              Demo Mode (AI Offline Fallback)
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase text-primary">
              <Cpu className="size-3.5 animate-pulse" />
              Real-Time AI Telemetry Online
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* LEFT — Audio & Speech Processing */}
          <section className="flex flex-col gap-5" aria-label="Audio and speech processing">
            <AudioPlayerCard
              clip={clip}
              onSelectClip={handleSelectClip}
              onAnalyze={handleAnalyze}
              analyzing={analyzing}
              nextLap={sessionLaps.length > 0 ? Math.max(...sessionLaps.map(l => l.lap)) + 1 : 1}
            />
            <MoodBadgeCard
              mood={analyzed ? clip.mood : "calm"}
              stress={analyzed ? clip.stress : 0}
            />
            <TranscriptCard
              transcript={clip.transcript}
              timestamp={clip.clipTime}
              speaker={clip.speaker}
              lap={clip.lap}
            />
          </section>

          {/* RIGHT — Lap Performance & Correlation */}
          <section className="flex flex-col gap-5" aria-label="Lap performance and correlation">
            <MetricsOverview laps={sessionLaps} />
            <LapStressChart data={sessionLaps} />
            
            {/* AI Strategic Advisory Card */}
            <Card className="border-primary/20 bg-primary/5 shadow-lg">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Sparkles className="size-4 text-primary" />
                <CardTitle className="text-sm font-medium">AI Strategic Advisory</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <div className="mt-0.5 rounded bg-primary/10 p-1">
                    <AlertTriangle className="size-4 text-primary" />
                  </div>
                  <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                    {insights}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* ── Member 4: Session History Table ── */}
            {sessionLaps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Race Session Log</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="pb-2 pr-4">Lap</th>
                          <th className="pb-2 pr-4">Lap Time</th>
                          <th className="pb-2 pr-4">Stress</th>
                          <th className="pb-2">Mood</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionLaps.map((lap) => (
                          <tr key={lap.lap} className="border-b border-border/50">
                            <td className="py-2 pr-4 font-semibold">L{lap.lap}</td>
                            <td className="py-2 pr-4 tabular-nums">{formatLapTime(lap.lapTime)}</td>
                            <td className="py-2 pr-4 tabular-nums">{lap.stress}%</td>
                            <td className="py-2 capitalize">{lap.mood}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

function parseTimeToSeconds(str: string): number | null {
  const trimmed = str.trim()
  if (!trimmed) return null
  
  const timeReg = /^(\d+):([0-5]?\d)(?:\.(\d+))?$/
  const match = trimmed.match(timeReg)
  if (match) {
    const mins = parseInt(match[1], 10)
    const secs = parseInt(match[2], 10)
    const msStr = match[3] || "0"
    const ms = parseFloat(`0.${msStr}`)
    return mins * 60 + secs + ms
  }
  
  const plainNum = parseFloat(trimmed)
  if (!isNaN(plainNum) && plainNum > 0 && isFinite(plainNum)) {
    return plainNum
  }
  
  return null
}
