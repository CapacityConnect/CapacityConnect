import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function LiveDataError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-destructive/30">
      <CardContent className="py-10 text-center">
        <p className="font-medium text-destructive">Live data unavailable</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        <Button className="mt-4" variant="outline" onClick={onRetry}>Retry</Button>
      </CardContent>
    </Card>
  )
}
