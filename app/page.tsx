"use client"

import Link from "next/link"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Award, BarChart3, BookOpenCheck, ShieldCheck, Sparkles, Users2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"

const FEATURES = [
  {
    icon: BarChart3,
    title: "Competency Gap Analysis",
    description:
      "Every employee gets a live competency profile so leadership can see exactly where training investment is needed.",
  },
  {
    icon: BookOpenCheck,
    title: "Personalized Learning Paths",
    description:
      "Courses are matched to each trainee's weakest competencies, so time is spent closing real gaps, not repeating strengths.",
  },
  {
    icon: Users2,
    title: "Expert-Led Training",
    description: "Verified trainers design and deliver courses with structured modules, resources, and assessments.",
  },
  {
    icon: Award,
    title: "Verified Certification",
    description: "Completing an assessment issues a verifiable certificate tied to a measurable competency improvement.",
  },
]

const PRIORITY_STEPS = [
  { label: "Data Analysis Fundamentals", done: true },
  { label: "Data Interpretation", done: false },
  { label: "Data Visualization", done: false },
  { label: "Final Assessment", done: false },
]

export default function LandingPage() {
  const { firebaseUser, appUser, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading || !firebaseUser) return
    if (!appUser) return
    if (appUser.status === "pending") {
      router.replace("/pending-approval")
    } else {
      router.replace(`/${appUser.role}`)
    }
  }, [loading, firebaseUser, appUser, router])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="size-4" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Capacity Connect</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Competency-led learning</p>
            </div>
          </div>
          <Button render={<Link href="/login" />} nativeButton={false} className="rounded-full">
            Sign in →
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Digital capacity building for public institutions
            </p>
            <h1 className="max-w-xl text-4xl font-medium leading-[1.08] tracking-tight text-balance sm:text-5xl">
              Know the gap.
              <br />
              Follow the path.
              <br />
              <span className="text-accent">Prove the improvement.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">
              Capacity Connect measures each employee&apos;s competencies against the targets for their role,
              recommends the learning that closes the largest gap, and tracks — with a transparent record — how every
              assessment changes their level.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" render={<Link href="/signup" />} nativeButton={false} className="rounded-full">
                Create your account
              </Button>
              <Button size="lg" variant="outline" render={<Link href="/login" />} nativeButton={false} className="rounded-full">
                I already have an account
              </Button>
            </div>
          </div>

          <Card className="border-border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Priority skill gap
                </p>
                <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent">33 points</span>
              </div>
              <h2 className="mt-2 text-2xl font-medium">Data Analysis</h2>
              <div className="mt-4 space-y-1.5">
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: "42%" }} />
                  <div
                    className="absolute inset-y-0 rounded-full bg-accent/50"
                    style={{ left: "42%", width: "33%" }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Current 42%</span>
                  <span>Target 75%</span>
                </div>
              </div>
              <div className="mt-6 space-y-2.5 border-t border-border pt-5">
                {PRIORITY_STEPS.map((step, i) => (
                  <div key={step.label} className="flex items-center gap-3 text-sm">
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                        step.done
                          ? "border-success bg-success/15 text-success"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className={step.done ? "text-muted-foreground line-through" : ""}>{step.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="mb-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Sparkles className="size-3.5 text-accent" />
            How the platform works
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <Card key={f.title} className="border-border">
                <CardContent className="pt-6">
                  <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <f.icon className="size-4.5" />
                  </div>
                  <h3 className="text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6">
        <p className="text-center text-xs text-muted-foreground">
          Capacity Connect — a training and competency management platform for institutional teams.
        </p>
      </footer>
    </div>
  )
}
