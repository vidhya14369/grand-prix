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
  
  const [driver, setDriver] = useState("16")
  const [session, setSession] = useState("Q3")
  const [analyzingStatus, setAnalyzingStatus] = useState("")
  const [isDemoData, setIsDemoData] = useState(true)
  const timersRef = useRef<NodeJS.Timeout[]>([])
  const [stintsData, setStintsData] = useState<Record<string, LapData[]>>({})

  const seedMockDataForScenario = (selectedDriver: string, selectedSession: string) => {
    let speedOffset = 0
    let stressOffset = 0
    
    if (selectedDriver === "44") {
      speedOffset = -1.2
      stressOffset = -15
    } else if (selectedDriver === "1") {
      speedOffset = -2.5
      stressOffset = -22
    } else if (selectedDriver === "81") {
      speedOffset = -0.5
      stressOffset = -5
    }
    
    let sessionSpeedOffset = 0
    let sessionStressOffset = 0
    if (selectedSession.startsWith("FP")) {
      sessionSpeedOffset = 1.5
      sessionStressOffset = -10
    } else if (selectedSession.startsWith("Q")) {
      sessionSpeedOffset = -0.8
      sessionStressOffset = 12
    }
    
    const baseLapData: LapData[] = [
      { lap: 1, lapTime: 81.982, mood: "calm", stress: 22 },
      { lap: 2, lapTime: 81.654, mood: "calm", stress: 18 },
      { lap: 3, lapTime: 81.431, mood: "calm", stress: 24 },
      { lap: 4, lapTime: 81.512, mood: "calm", stress: 31 },
      { lap: 5, lapTime: 81.889, mood: "tired", stress: 48 },
      { lap: 6, lapTime: 82.104, mood: "tired", stress: 55 },
      { lap: 7, lapTime: 82.372, mood: "tired", stress: 61 },
      { lap: 8, lapTime: 82.918, mood: "stressed", stress: 74 },
      { lap: 9, lapTime: 83.441, mood: "stressed", stress: 84 },
      { lap: 10, lapTime: 82.987, mood: "stressed", stress: 79 },
      { lap: 11, lapTime: 82.233, mood: "tired", stress: 58 },
      { lap: 12, lapTime: 81.744, mood: "calm", stress: 34 },
      { lap: 13, lapTime: 81.588, mood: "calm", stress: 27 },
      { lap: 14, lapTime: 81.902, mood: "tired", stress: 46 },
    ]
    
    return baseLapData.map(item => {
      const computedTime = Math.max(70.0, item.lapTime + speedOffset + sessionSpeedOffset)
      const computedStress = Math.max(5, Math.min(99, item.stress + stressOffset + sessionStressOffset))
      
      let mood: Mood = "calm"
      if (computedStress > 60) mood = "stressed"
      else if (computedStress > 30) mood = "tired"
      
      return {
        lap: item.lap,
        lapTime: +computedTime.toFixed(3),
        stress: computedStress,
        mood
      }
    })
  }

  function handleDriverChange(newDriver: string) {
    // Save current stint data first
    const currentKey = `${driver}-${session}`
    setStintsData(prev => ({
      ...prev,
      [currentKey]: sessionLaps
    }))

    setDriver(newDriver)
    setIsDemoData(true)
    
    // Retrieve or seed new stint
    const nextKey = `${newDriver}-${session}`
    const freshData = stintsData[nextKey] || seedMockDataForScenario(newDriver, session)
    setSessionLaps(freshData)
    
    const LeclercBase = "Analyzing stint pace... Run AI analysis on the driver's radio to compute performance delta."
    const HamiltonBase = "Lewis Hamilton: Optimal tire temperature management. Low cumulative stress (avg 24%). Stint strategy is stable."
    const VerstappenBase = "Max Verstappen: Champion's pace. Stint best 1:17.350 on Lap 3. Minimal stress levels (avg 18%). Maintain current pace."
    const PiastriBase = "Oscar Piastri: Steady lap time progression. Moderate stress. Prepare for standard pit window options."
    
    if (newDriver === "44") setInsights(HamiltonBase)
    else if (newDriver === "1") setInsights(VerstappenBase)
    else if (newDriver === "81") setInsights(PiastriBase)
    else setInsights(LeclercBase)
  }

  function handleSessionChange(newSession: string) {
    // Save current stint data first
    const currentKey = `${driver}-${session}`
    setStintsData(prev => ({
      ...prev,
      [currentKey]: sessionLaps
    }))

    setSession(newSession)
    setIsDemoData(true)
    
    // Retrieve or seed new stint
    const nextKey = `${driver}-${newSession}`
    const freshData = stintsData[nextKey] || seedMockDataForScenario(driver, newSession)
    setSessionLaps(freshData)
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
      console.warn("FastAPI backend offline, loading local static telemetry mock data...")
      setIsFallbackMode(true)
      setIsDemoData(true)
      const { lapData } = await import("@/lib/telemetry-data")
      setSessionLaps(lapData)
      setStintsData(prev => ({
        ...prev,
        [`${driver}-${session}`]: lapData
      }))
      setInsights("Driver vocal stress exceeded 70% during Lap 9. Coincided with a +2.1s pace drop. Recommend tire change (Slicks to Intermediates).")
    }
  }

  function handleSelectClip(next: RadioClip, file?: File) {
    setClip(next)
    setUploadedFile(file)
    setAnalyzed(false) // Wait for user to trigger explicit analysis
  }

  async function handleAnalyze(customLapNum: number, customLapTimeStr: string, customLabel?: string) {
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
      
      // Clear status timers immediately upon successful prediction response
      clearStatusTimers()
      setAnalyzingStatus("3/3 Updating telemetry metrics...")
      
      // Update clip UI view
      setClip({
        ...clip,
        mood: resultData.mood,
        stress: resultData.stress,
        transcript: resultData.transcript,
        lap: resultData.lap,
        label: customLabel || clip.label || "Team Radio"
      })
      
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

            {/* ── Member 4: Session History Table ── */}
            {sessionLaps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Race Session Log {isDemoData && "(Demo Telemetry)"}</CardTitle>
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
