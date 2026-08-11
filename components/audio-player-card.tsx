"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Pause, Play, UploadCloud, Waves, Loader2, Radio, Clock, Mic, MicOff } from "lucide-react"
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

/* ── Member 4: Extended tab type to include microphone recording ── */
type Tab = "preset" | "upload" | "record"

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
  const [mounted, setMounted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [localFile, setLocalFile] = useState<File | null>(null)

  /* ── Member 4: Microphone recording state & AudioContext refs ── */
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [micError, setMicError] = useState<string | null>(null)
  const recordingTimerRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const leftChannelRef = useRef<Float32Array[]>([])
  const recordingLengthRef = useRef<number>(0)

  // Reseed the waveform per clip so each radio call looks distinct.
  const seedBase = useMemo(() => {
    let s = 0
    for (const c of clip.id) s = (s * 31 + c.charCodeAt(0)) % 233280
    return s + 7
  }, [clip.id])
  const bars = useWaveform(64, seedBase)

  const duration = clip.duration

  // Synchronize dynamic browser HTML5 Audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
    }

    let audioUrl = ""
    if (clip.id.startsWith("custom-")) {
      if (localFile) {
        audioUrl = URL.createObjectURL(localFile)
      }
    } else {
      audioUrl = `http://localhost:8000/presets/${clip.fileName}`
    }

    if (audioUrl) {
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      
      const handleTimeUpdate = () => {
        setProgress(parseFloat(audio.currentTime.toFixed(1)))
      }
      
      const handleEnded = () => {
        setPlaying(false)
        setProgress(0)
      }

      audio.addEventListener("timeupdate", handleTimeUpdate)
      audio.addEventListener("ended", handleEnded)

      return () => {
        audio.pause()
        audio.removeEventListener("timeupdate", handleTimeUpdate)
        audio.removeEventListener("ended", handleEnded)
        if (audioUrl.startsWith("blob:")) {
          URL.revokeObjectURL(audioUrl)
        }
      }
    }
  }, [clip.id, localFile])

  /* ── Member 4: Cleanup recording on unmount & handle mount state ── */
  useEffect(() => {
    setMounted(true)
    return () => {
      if (processorRef.current) {
        processorRef.current.disconnect()
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current)
      }
    }
  }, [])

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setLocalFile(file)
    // Build a synthetic clip from the uploaded file for testing.
    onSelectClip(
      {
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
      },
      file
    )
  }

  /* ── Member 4: Start microphone recording ── */
  async function startRecording() {
    setMicError(null)
    leftChannelRef.current = []
    recordingLengthRef.current = 0

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 })
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      
      // Create a script processor with buffer size 4096, 1 input channel, 1 output channel
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (e) => {
        const left = e.inputBuffer.getChannelData(0)
        leftChannelRef.current.push(new Float32Array(left))
        recordingLengthRef.current += left.length
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      setIsRecording(true)
      setRecordingTime(0)

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime((t) => t + 1)
      }, 1000)
    } catch (err: unknown) {
      const error = err as Error
      if (error.name === "NotAllowedError") {
        setMicError("Microphone access denied. Please allow microphone permission in your browser settings.")
      } else if (error.name === "NotFoundError") {
        setMicError("No microphone found. Please connect a microphone and try again.")
      } else {
        setMicError(`Microphone error: ${error.message}`)
      }
    }
  }

  /* ── Member 4: Stop microphone recording ── */
  function stopRecording() {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    setIsRecording(false)

    // Stop recording and process audio data
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }

    // Flatten channel data and encode to WAV (resampled directly to 16kHz mono)
    const samples = flattenArray(leftChannelRef.current, recordingLengthRef.current)
    const wavBuffer = encodeWAV(samples, 16000)
    const blob = new Blob([wavBuffer], { type: "audio/wav" })
    const file = new File([blob], "mic-recording.wav", { type: "audio/wav" })
    setLocalFile(file)

    onSelectClip(
      {
        id: `custom-mic-${Date.now()}`,
        lap: 0,
        label: "Mic Recording",
        timestamp: "—",
        duration: recordingTime || 3,
        fileName: "mic-recording.wav",
        mood: "tired",
        stress: 52,
        clipTime: "00:00",
        speaker: "Mic Input",
        transcript: "Microphone audio recorded. Run analysis to detect vocal stress.",
      },
      file
    )
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
        {/* ── Tab toggle (Member 4: expanded to 3 columns) ── */}
        <div
          className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-background/60 p-1"
          role="tablist"
          aria-label="Audio source"
        >
          <TabButton active={tab === "preset"} onClick={() => setTab("preset")} icon={Radio}>
            Historical Radio
          </TabButton>
          <TabButton active={tab === "upload"} onClick={() => setTab("upload")} icon={UploadCloud}>
            Upload File
          </TabButton>
          <TabButton active={tab === "record"} onClick={() => setTab("record")} icon={Mic}>
            Record Mic
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
        ) : tab === "upload" ? (
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
        ) : (
          /* ── Member 4: Microphone Recording Tab Panel ── */
          <div role="tabpanel" aria-label="Microphone recording" className="flex flex-col items-center gap-4 py-4">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex size-28 flex-col items-center justify-center gap-2 rounded-full border-2 transition-all ${
                isRecording
                  ? "animate-pulse border-destructive bg-destructive/10 text-destructive"
                  : "border-border bg-secondary/40 text-muted-foreground hover:border-primary hover:bg-primary/10 hover:text-primary"
              }`}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? (
                <MicOff className="size-8" />
              ) : (
                <Mic className="size-8" />
              )}
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                {isRecording ? "Stop" : "Record"}
              </span>
            </button>

            {/* Recording timer display */}
            {isRecording && (
              <span className="font-mono text-lg tabular-nums text-destructive">
                {formatClock(recordingTime)}
              </span>
            )}

            {/* Mic error message */}
            {micError && (
              <p className="max-w-xs text-center text-xs text-destructive">{micError}</p>
            )}

            <p className="text-center font-mono text-[11px] text-muted-foreground">
              Record team radio via your microphone
            </p>
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
            {mounted ? bars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-full transition-colors"
                style={{
                  height: `${Math.round(Math.max(8, h * 100))}%`,
                  backgroundColor:
                    i <= activeBar && playing
                      ? "var(--primary)"
                      : i <= activeBar
                        ? "color-mix(in oklch, var(--primary) 55%, transparent)"
                        : "var(--muted)",
                }}
              />
            )) : (
              <div className="flex w-full items-center justify-center font-mono text-xs text-muted-foreground animate-pulse">
                INITIALIZING TELEMETRY RECEIVER...
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <Button
              size="icon"
              variant="secondary"
              className="size-9 shrink-0 rounded-full"
              onClick={() => {
                const audio = audioRef.current
                if (!audio) return
                if (playing) {
                  audio.pause()
                  setPlaying(false)
                } else {
                  if (audio.currentTime >= audio.duration) {
                    audio.currentTime = 0
                  }
                  audio.play().catch(e => console.error("Playback failed:", e))
                  setPlaying(true)
                }
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

function flattenArray(channelBuffer: Float32Array[], recordingLength: number): Float32Array {
  const result = new Float32Array(recordingLength)
  let offset = 0
  for (let i = 0; i < channelBuffer.length; i++) {
    const buffer = channelBuffer[i]
    result.set(buffer, offset)
    offset += buffer.length
  }
  return result
}

function writeUTFBytes(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

function encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  writeUTFBytes(view, 0, "RIFF")
  view.setUint32(4, 36 + samples.length * 2, true)
  writeUTFBytes(view, 8, "WAVE")
  writeUTFBytes(view, 12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeUTFBytes(view, 36, "data")
  view.setUint32(40, samples.length * 2, true)

  let offset = 44
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }

  return buffer
}
