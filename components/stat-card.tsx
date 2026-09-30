import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  className,
}: {
  label: string
  value: string | number
  icon: LucideIcon
  hint?: string
  className?: string
}) {
  return (
    <Card className={cn(className)}>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-semibold leading-tight">{value}</span>
          <span className="text-sm text-muted-foreground">{label}</span>
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  )
}
