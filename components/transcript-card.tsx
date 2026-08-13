import { MessageSquareText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function TranscriptCard({
  transcript,
  timestamp,
  speaker,
  lap,
  label,
}: {
  transcript: string
  timestamp: string
  speaker: string
  lap: number
  label?: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <MessageSquareText className="size-4 text-primary" aria-hidden="true" />
          Live Audio Transcript
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border bg-background/60 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-md bg-primary/15 px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider text-primary ring-1 ring-primary/25">
              {speaker}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              [{timestamp}] · Lap {lap} {label && `· ${label}`}
            </span>
          </div>
          <p className="text-pretty text-[15px] leading-relaxed text-foreground">
            &ldquo;{transcript}&rdquo;
          </p>
        </div>
        <p className="mt-3 font-mono text-[11px] text-muted-foreground">
          Speech-to-text · Whisper-small
        </p>
      </CardContent>
    </Card>
  )
}
