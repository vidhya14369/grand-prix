"use client"

import { useState, useEffect, useRef } from "react"
import { TopNav } from "@/components/top-nav"
import { type Mood } from "@/lib/telemetry-data"
import { AudioPlayerCard } from "@/components/audio-player-card"
import { MoodBadgeCard } from "@/components/mood-badge-card"
import { TranscriptCard } from "@/components/transcript-card"
import { MetricsOverview } from "@/components/metrics-overview"
import { LapStressChart } from "@/components/lap-stress-chart"
/* ── Member 4: Added formatLapTime import for session table ── */
import { currentAnalysis, defaultEmptyClip, formatLapTime, type RadioClip, type LapData } from "@/lib/telemetry-data"
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
  
  const [driver, setDriver] = useState("16")
  const [session, setSession] = useState("Q3")
  const [analyzingStatus, setAnalyzingStatus] = useState("")
  const [isDemoData, setIsDemoData] = useState(true)
  const timersRef = useRef<NodeJS.Timeout[]>([])
  type StintMemory = {
    laps: LapData[]
    clips: RadioClip[]
  }

  const [stintsData, setStintsData] = useState<Record<string, StintMemory>>({})
  const [historyClips, setHistoryClips] = useState<RadioClip[]>([])

  const driverNames: Record<string, string> = {
    "16": "Charles Leclerc",
    "44": "Lewis Hamilton",
    "1": "Max Verstappen",
    "81": "Oscar Piastri"
  }

  function handleDriverChange(newDriver: string) {
    // 1. Save current driver stint data
    const currentKey = `${driver}-${session}`
    const updatedMemory = {
      ...stintsData,
      [currentKey]: { laps: sessionLaps, clips: historyClips }
    }
    setStintsData(updatedMemory)

    // 2. Switch driver
    setDriver(newDriver)
    setIsDemoData(false)

    // 3. Load target driver stint data (or empty if none uploaded yet)
    const nextKey = `${newDriver}-${session}`
    const targetStint = updatedMemory[nextKey] || { laps: [], clips: [] }
    setSessionLaps(targetStint.laps)
    setHistoryClips(targetStint.clips)
    setClip(targetStint.clips.length > 0 ? targetStint.clips[targetStint.clips.length - 1] : defaultEmptyClip)

    const name = driverNames[newDriver] || "Driver"
    if (targetStint.laps.length > 0) {
      const avgStress = (targetStint.laps.reduce((a, b) => a + b.stress, 0) / targetStint.laps.length).toFixed(1)
      setInsights(`${name}: ${targetStint.laps.length} stint lap(s) logged. Average vocal stress: ${avgStress}%.`)
    } else {
      setInsights(`Stint telemetry initialized for ${name}. Upload team radio clips to analyze vocal stress and pace delta.`)
    }
  }

  function handleSessionChange(newSession: string) {
    // 1. Save current session stint data
    const currentKey = `${driver}-${session}`
    const updatedMemory = {
      ...stintsData,
      [currentKey]: { laps: sessionLaps, clips: historyClips }
    }
    setStintsData(updatedMemory)

    // 2. Switch session
    setSession(newSession)
    setIsDemoData(false)

    // 3. Load target session stint data (or empty if none uploaded yet)
    const nextKey = `${driver}-${newSession}`
    const targetStint = updatedMemory[nextKey] || { laps: [], clips: [] }
    setSessionLaps(targetStint.laps)
    setHistoryClips(targetStint.clips)
    setClip(targetStint.clips.length > 0 ? targetStint.clips[targetStint.clips.length - 1] : defaultEmptyClip)

    const name = driverNames[driver] || "Driver"
    if (targetStint.laps.length > 0) {
      const avgStress = (targetStint.laps.reduce((a, b) => a + b.stress, 0) / targetStint.laps.length).toFixed(1)
      setInsights(`${name} [${newSession}]: ${targetStint.laps.length} stint lap(s) logged. Average vocal stress: ${avgStress}%.`)
    } else {
      setInsights(`Session switched to ${newSession} for ${name}. Upload team radio clips to analyze stint telemetry.`)
    }
  }

  function clearStatusTimers() {
    timersRef.current.forEach((t) => clearTimeout(t))
    timersRef.current = []
  }

  // Sync data on page load and clear timers on unmount
  useEffect(() => {
    fetchSessionData()
    return () => {
      clearStatusTimers()
    }
  }, [])

  async function fetchSessionData() {
    try {
      const res = await fetch("http://localhost:8000/api/session")
      if (res.ok) {
        const data = await res.json()
        setSessionLaps(data)
        
        const mappedClips: RadioClip[] = data.map((item: any) => ({
          id: `session-${item.lap_number || item.lap}`,
          lap: item.lap_number || item.lap,
          label: item.speaker || "Team Radio",
          timestamp: "Logged",
          duration: 14,
          fileName: `radio_lap${item.lap_number || item.lap}.wav`,
          mood: item.mood || "calm",
          stress: item.stress || 0,
          clipTime: "00:00",
          speaker: item.speaker || "Driver Radio",
          transcript: item.transcript || "[Radio Clip]"
        }))
        setHistoryClips(mappedClips)

        setStintsData(prev => ({
          ...prev,
          [`${driver}-${session}`]: data
        }))
        setIsDemoData(false)
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
      console.warn("FastAPI backend offline, reset telemetry state...")
      setIsFallbackMode(true)
      setIsDemoData(true)
      setSessionLaps([])
      setHistoryClips([])
      setInsights("Driver vocal stress monitor online. Upload team radio clips to generate live AI insights.")
    }
  }

  function handleSelectClip(next: RadioClip, file?: File) {
    setClip({
      ...next,
      file: file || next.file
    })
    if (file) {
      setUploadedFile(file)
    }
    setAnalyzed(true)
  }

  async function handleAnalyze(customLapNum: number, customLapTimeStr: string, customLabel?: string) {
    const isCustom = true
    setAnalyzing(true)
    clearStatusTimers()
    setAnalyzingStatus("1/3 Upload accepted, transcribing speech...")
    
    const t1 = setTimeout(() => {
      setAnalyzingStatus("2/3 Analyzing vocal emotions...")
    }, 800)
    
    const t2 = setTimeout(() => {
      setAnalyzingStatus("3/3 Updating telemetry metrics...")
    }, 1800)
    
    timersRef.current = [t1, t2]
    
    try {
      let resultData;
      
      // Prepare multipart form data for file upload
      const formData = new FormData()
      if (uploadedFile) {
        formData.append("file", uploadedFile)
      }
      
      const parsedSeconds = parseTimeToSeconds(customLapTimeStr) || 82.4
      formData.append("lap", customLapNum.toString())
      formData.append("lapTime", parsedSeconds.toString())
      formData.append("speaker", customLabel || "Driver Radio")
      
      const res = await fetch("http://localhost:8000/api/predict", {
        method: "POST",
        body: formData,
      })
      
      if (!res.ok) throw new Error("Backend failed processing file")
      resultData = await res.json()
      setIsFallbackMode(false)
      
      // Clear status timers immediately upon successful prediction response
      clearStatusTimers()
      setAnalyzingStatus("3/3 Updating telemetry metrics...")
      
      const newHistoryClip: RadioClip = {
        id: `upload-lap${resultData.lap}-${Date.now()}`,
        lap: resultData.lap,
        label: customLabel || "Team Radio",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration: 14,
        fileName: uploadedFile?.name || `radio_lap${resultData.lap}.wav`,
        mood: resultData.mood,
        stress: resultData.stress,
        transcript: resultData.transcript,
        clipTime: "00:00",
        speaker: resultData.speaker || customLabel || "Driver Radio",
        file: uploadedFile
      }

      setHistoryClips(prev => {
        const filtered = prev.filter(c => c.lap !== newHistoryClip.lap)
        return [...filtered, newHistoryClip].sort((a, b) => a.lap - b.lap)
      })

      // Update clip UI view
      setClip(newHistoryClip)
      
      // Refresh session logs and insights
      await fetchSessionData()
      setIsDemoData(false) // User ran a live analysis!
      setAnalyzed(true)
      
    } catch (err) {
      console.error("Inference fetch failed, executing local mock timeout:", err)
      setIsFallbackMode(true)
      clearStatusTimers()
      setAnalyzingStatus("3/3 Updating telemetry metrics...")
      
      // Local Mock fallback in case backend is offline
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const parsedSeconds = parseTimeToSeconds(customLapTimeStr) || 82.4
      
      // Fallback update
      const updatedClip = {
        ...clip,
        transcript: clip.transcript || "Copy that, tyres feel completely gone. I am losing the rear.",
        mood: clip.mood || "stressed",
        stress: clip.stress || 84,
        lap: isCustom ? customLapNum : clip.lap,
        label: customLabel || clip.label || "Team Radio"
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

      setIsDemoData(false) // User ran a live analysis!
      setAnalyzed(true)
    } finally {
      setAnalyzing(false)
      setAnalyzingStatus("")
    }
  }

  async function handleClearSession() {
    try {
      await fetch("http://localhost:8000/api/session/reset", { method: "DELETE" })
    } catch (e) {
      console.warn("Failed to clear session on backend:", e)
    }
    setStintsData({})
    setSessionLaps([])
    setHistoryClips([])
    setClip(defaultEmptyClip)
    setInsights("Session history cleared. Upload new radio clips to log stint telemetry.")
  }

  return (
    <div className="min-h-screen">
      <TopNav 
        driver={driver} 
        session={session} 
        onDriverChange={handleDriverChange} 
        onSessionChange={handleSessionChange} 
      />

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
              analyzingStatus={analyzingStatus}
              historyClips={historyClips}
            />
            <MoodBadgeCard
              mood={analyzed ? clip.mood : "calm"}
              stress={analyzed ? clip.stress : 0}
            />
            
            {/* AI Strategic Advisory Card (Moved here for visual hierarchy) */}
            <Card className="border-primary/20 bg-primary/5 shadow-lg">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Sparkles className="size-4 text-primary" />
                <CardTitle className="text-sm font-medium">AI Strategic Advisory {isDemoData && "(Demo Telemetry)"}</CardTitle>
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

            <TranscriptCard
              transcript={clip.transcript}
              timestamp={clip.clipTime}
              speaker={clip.speaker}
              lap={clip.lap}
              label={clip.label}
            />
          </section>

          {/* RIGHT — Lap Performance & Correlation */}
          <section className="flex flex-col gap-5" aria-label="Lap performance and correlation">
            <MetricsOverview laps={sessionLaps} isDemo={isDemoData} />
            <LapStressChart data={sessionLaps} isDemo={isDemoData} />

            {/* ── Member 4: Historical Audio & Stint Log Table ── */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">Historical Audio &amp; Stint Log</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Uploaded team radio audio clips and telemetry</p>
                </div>
                {sessionLaps.length > 0 && (
                  <button 
                    onClick={handleClearSession}
                    className="font-mono text-xs text-rose-400 hover:text-rose-300 transition-colors border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 rounded"
                  >
                    Clear History
                  </button>
                )}
              </CardHeader>
              <CardContent>
                {sessionLaps.length === 0 ? (
                  <div className="py-8 text-center font-mono text-xs text-muted-foreground">
                    No historical audio uploaded yet. Upload a team radio clip above to log stint telemetry.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[280px] overflow-y-auto pr-1">
                    <table className="w-full text-left font-mono text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="pb-2 pr-4">Lap</th>
                          <th className="pb-2 pr-4">Radio Name / Speaker</th>
                          <th className="pb-2 pr-4">Lap Time</th>
                          <th className="pb-2 pr-4">Stress Level</th>
                          <th className="pb-2">Mood</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionLaps.map((lap) => (
                          <tr key={lap.lap} className="border-b border-border/50">
                            <td className="py-2 pr-4 font-semibold">L{lap.lap}</td>
                            <td className="py-2 pr-4 text-primary font-medium">{lap.speaker || "Driver Radio"}</td>
                            <td className="py-2 pr-4 tabular-nums">{formatLapTime(lap.lapTime)}</td>
                            <td className="py-2 pr-4 tabular-nums font-semibold">{lap.stress}%</td>
                            <td className="py-2 capitalize">{lap.mood}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
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
