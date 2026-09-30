"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { GraduationCap, KeyRound, ShieldCheck, Users2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { getAuthErrorMessage } from "@/lib/auth-errors"

type Workspace = "trainee" | "trainer" | "admin"

const WORKSPACES: Array<{
  id: Workspace
  label: string
  icon: typeof GraduationCap
  email: string
  password: string
  description: string
}> = [
  {
    id: "trainee",
    label: "Trainee",
    icon: GraduationCap,
    email: "trainee@capacityconnect.demo",
    password: "Demo@123",
    description: "Build skills, track competencies, and earn certificates.",
  },
  {
    id: "trainer",
    label: "Trainer",
    icon: Users2,
    email: "trainer@capacityconnect.demo",
    password: "Demo@123",
    description: "Author courses, publish assessments, monitor performance.",
  },
  {
    id: "admin",
    label: "Admin",
    icon: ShieldCheck,
    email: "admin@capacityconnect.demo",
    password: "Demo@123",
    description: "Approve users, manage content, review platform analytics.",
  },
]

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function selectWorkspace(id: Workspace) {
    setWorkspace(id)
    const ws = WORKSPACES.find((w) => w.id === id)!
    setEmail(ws.email)
    setPassword(ws.password)
    setError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      toast.success("Welcome back")
      router.push("/")
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const activeWorkspace = WORKSPACES.find((w) => w.id === workspace)
  const submitLabel = submitting ? "Signing in…" : activeWorkspace ? `Continue as ${activeWorkspace.label}` : "Sign in"

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="size-4" />
          </div>
          <span className="text-sm font-semibold">Capacity Connect</span>
        </Link>

        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-3xl font-medium tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">Use your institutional account to continue.</p>

          <div className="mt-7">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Workspace</p>
            <div className="grid grid-cols-3 gap-2">
              {WORKSPACES.map((w) => {
                const active = workspace === w.id
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => selectWorkspace(w.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-medium transition-colors ${
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    <w.icon className="size-4" />
                    {w.label}
                  </button>
                )
              })}
            </div>
            {activeWorkspace && (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{activeWorkspace.description}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setWorkspace(null)
                }}
                placeholder="you@department.gov"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setWorkspace(null)
                }}
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting} className="mt-2 rounded-full" size="lg">
              {submitLabel}
            </Button>
          </form>

          <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 p-3.5">
            <KeyRound className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <div className="text-xs leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">Judging the prototype?</p>
              <p className="mt-0.5">
                Pick a workspace above to autofill a real demo account, then select{" "}
                <span className="font-medium text-foreground">Sign in</span>. Each demo login uses genuine Firebase
                Authentication — no mock sessions.
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {"Don't have an account? "}
            <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
              Sign up
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground lg:text-left">
          © {new Date().getFullYear()} Capacity Connect
        </p>
      </div>

      <div className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/60">
          Mid-career capacity programme
        </p>
        <blockquote className="max-w-lg font-serif text-3xl font-medium leading-tight">
          &ldquo;I could finally see why a course was recommended — and what it did for me.&rdquo;
        </blockquote>
        <div>
          <p className="text-sm text-primary-foreground/70">Section Officer, Planning Cell · pilot cohort</p>
          <div className="mt-8 grid grid-cols-3 gap-6 border-t border-primary-foreground/15 pt-6">
            <div>
              <p className="text-2xl font-semibold">1,240</p>
              <p className="text-xs text-primary-foreground/60">officers onboarded</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">38</p>
              <p className="text-xs text-primary-foreground/60">courses live</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-accent">+14 pts</p>
              <p className="text-xs text-primary-foreground/60">avg. competency gain</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
