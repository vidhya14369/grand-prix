export type Mood = "calm" | "stressed" | "tired"

export type LapData = {
  lap: number
  lapTime: number // seconds
  mood: Mood
  stress: number // 0-100
}

export const moodMeta: Record<
  Mood,
  { label: string; color: string; chartVar: string; description: string }
> = {
  calm: {
    label: "Calm",
    color: "var(--calm)",
    chartVar: "var(--chart-2)",
    description: "Composed & in control",
  },
  tired: {
    label: "Tired",
    color: "var(--tired)",
    chartVar: "var(--chart-3)",
    description: "Fatigue detected in voice",
  },
  stressed: {
    label: "Stressed",
    color: "var(--stressed)",
    chartVar: "var(--chart-4)",
    description: "Elevated vocal stress",
  },
}

// Simulated stint: lap time (in seconds) vs detected driver mood/stress.
export const lapData: LapData[] = [
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

export function formatLapTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds - mins * 60
  return `${mins}:${secs.toFixed(3).padStart(6, "0")}`
}

export const drivers = [
  { id: "16", name: "C. Leclerc", team: "Scuderia" },
  { id: "44", name: "L. Hamilton", team: "Scuderia" },
  { id: "1", name: "M. Verstappen", team: "Oracle" },
  { id: "81", name: "O. Piastri", team: "Papaya" },
]

export const sessions = ["FP1", "FP2", "FP3", "Q1", "Q2", "Q3", "Race"]

export type RadioClip = {
  id: string
  lap: number
  label: string // e.g. "Turn 1"
  timestamp: string // wall-clock time, e.g. "14:22"
  duration: number // seconds
  fileName: string
  mood: Mood
  stress: number
  transcript: string
  clipTime: string // position within the stint clip, e.g. "00:14"
  speaker: string
  file?: File
}

// Historical user uploaded radio clips list starts empty
export const radioPresets: RadioClip[] = []

// Default initial empty clip view
export const defaultEmptyClip: RadioClip = {
  id: "initial-empty",
  lap: 1,
  label: "Team Radio",
  timestamp: "—",
  duration: 10,
  fileName: "upload_audio.wav",
  mood: "calm",
  stress: 0,
  clipTime: "00:00",
  speaker: "Driver Radio",
  transcript: "No audio uploaded yet. Upload a team radio clip or record mic to begin AI speech & vocal stress analysis."
}

export const currentAnalysis = defaultEmptyClip
