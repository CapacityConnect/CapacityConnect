import { cn } from "@/lib/utils"

export function CompetencyBar({
  label,
  current,
  target,
  className,
}: {
  label: string
  current: number
  target: number
  className?: string
}) {
  const gapClosed = current >= target
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {current}% <span className="text-xs">/ {target}% target</span>
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full", gapClosed ? "bg-success" : "bg-accent")}
          style={{ width: `${Math.min(current, 100)}%` }}
        />
        <div className="absolute inset-y-0 w-px bg-foreground/30" style={{ left: `${Math.min(target, 100)}%` }} />
      </div>
    </div>
  )
}
