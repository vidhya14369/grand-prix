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
}

// Preset historical radio clips captured during the stint.
export const radioPresets: RadioClip[] = [
  {
    id: "lap3-t1",
    lap: 3,
    label: "Turn 1",
    timestamp: "14:06",
    duration: 11,
    fileName: "radio_lap03_turn1.wav",
    mood: "calm",
    stress: 24,
    clipTime: "00:09",
    speaker: "Driver Radio",
    transcript:
      "Car feels good, balance is where I want it. Happy to keep pushing at this pace, no complaints.",
  },
  {
    id: "lap7-pit",
    lap: 7,
    label: "Pit Entry",
    timestamp: "14:15",
    duration: 13,
    fileName: "radio_lap07_pitentry.wav",
    mood: "tired",
    stress: 61,
    clipTime: "00:11",
    speaker: "Driver Radio",
    transcript:
      "Starting to feel the rears go, legs are getting heavy. How many laps left on this set? Give me a target.",
  },
  {
    id: "lap9-t4",
    lap: 9,
    label: "Turn 4",
    timestamp: "14:22",
    duration: 14,
    fileName: "radio_lap09_turn4.wav",
    mood: "stressed",
    stress: 84,
    clipTime: "00:14",
    speaker: "Driver Radio",
    transcript:
      "Tires are going, I'm losing grip in turn 4! We need to think about strategy, I can't hold this pace much longer.",
  },
  {
    id: "lap12-back",
    lap: 12,
    label: "Back Straight",
    timestamp: "14:31",
    duration: 10,
    fileName: "radio_lap12_backstraight.wav",
    mood: "calm",
    stress: 34,
    clipTime: "00:08",
    speaker: "Driver Radio",
    transcript:
      "Okay, fresh tires are switched on now. Feeling much better, let's go get them. Full send.",
  },
]

// Default analyzed radio call (Lap 9 — the stressed peak).
export const currentAnalysis = radioPresets[2]
