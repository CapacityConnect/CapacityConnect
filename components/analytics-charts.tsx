import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export interface GapDatum { label: string; value: number }
export interface ParticipationDatum { label: string; total: number; completed: number }
export interface AssessmentDatum { label: string; value: number }

function EmptyChart({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{message}</p>
}

export function CompetencyGapChart({ data }: { data: GapDatum[] }) {
  const max = Math.max(...data.map((item) => item.value), 1)
  return <Card><CardHeader><CardTitle className="text-base">Competency-gap distribution</CardTitle><CardDescription>Average points below target across trainee competency records.</CardDescription></CardHeader><CardContent>{data.length === 0 ? <EmptyChart message="No trainee competency records yet." /> : <svg viewBox={`0 0 620 ${Math.max(data.length * 42 + 24, 96)}`} role="img" aria-label="Competency gap distribution" className="h-auto w-full"><g>{data.map((item, index) => { const y = index * 42 + 18; const width = (item.value / max) * 410; return <g key={item.label}><text x="0" y={y + 5} className="fill-foreground text-[13px]">{item.label}</text><rect x="175" y={y - 8} width="410" height="18" rx="9" className="fill-secondary" /><rect x="175" y={y - 8} width={width} height="18" rx="9" className="fill-primary" /><text x={Math.min(190 + width, 580)} y={y + 5} className="fill-muted-foreground text-[12px]">{item.value} pts</text></g> })}</g></svg>}</CardContent></Card>
}

export function ParticipationCompletionChart({ data }: { data: ParticipationDatum[] }) {
  const max = Math.max(...data.map((item) => item.total), 1)
  const width = Math.max(data.length * 92, 420)
  return <Card><CardHeader><CardTitle className="text-base">Participation and completion</CardTitle><CardDescription>Live enrollments by course, with completed learners highlighted.</CardDescription></CardHeader><CardContent className="overflow-x-auto">{data.length === 0 ? <EmptyChart message="No enrollment records yet." /> : <svg viewBox={`0 0 ${width} 220`} role="img" aria-label="Course participation and completion" className="h-auto min-w-[420px] w-full"><line x1="36" y1="175" x2={width - 16} y2="175" className="stroke-border" />{data.map((item, index) => { const x = 52 + index * 92; const totalHeight = (item.total / max) * 130; const completeHeight = (item.completed / max) * 130; return <g key={item.label}><rect x={x} y={175 - totalHeight} width="30" height={totalHeight} rx="5" className="fill-secondary" /><rect x={x} y={175 - completeHeight} width="30" height={completeHeight} rx="5" className="fill-accent" /><text x={x + 15} y="193" textAnchor="middle" className="fill-muted-foreground text-[10px]">{item.label.length > 12 ? `${item.label.slice(0, 11)}…` : item.label}</text><title>{`${item.label}: ${item.completed} completed of ${item.total}`}</title></g> })}</svg>}</CardContent></Card>
}

export function AssessmentPerformanceChart({ data }: { data: AssessmentDatum[] }) {
  const max = Math.max(...data.map((item) => item.value), 1)
  const width = Math.max(data.length * 78, 420)
  return <Card><CardHeader><CardTitle className="text-base">Assessment performance</CardTitle><CardDescription>Distribution of submitted assessment scores from Firestore.</CardDescription></CardHeader><CardContent className="overflow-x-auto">{data.length === 0 ? <EmptyChart message="No assessment attempts yet." /> : <svg viewBox={`0 0 ${width} 220`} role="img" aria-label="Assessment performance distribution" className="h-auto min-w-[420px] w-full"><line x1="36" y1="175" x2={width - 16} y2="175" className="stroke-border" />{data.map((item, index) => { const x = 50 + index * 78; const height = (item.value / max) * 130; return <g key={item.label}><rect x={x} y={175 - height} width="34" height={height} rx="5" className="fill-primary" /><text x={x + 17} y="193" textAnchor="middle" className="fill-muted-foreground text-[10px]">{item.label}</text><text x={x + 17} y={Math.max(168 - height, 12)} textAnchor="middle" className="fill-foreground text-[11px]">{item.value}</text></g> })}</svg>}</CardContent></Card>
}
