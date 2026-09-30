"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/auth-context"
import { getAuthErrorMessage } from "@/lib/auth-errors"

export default function SignupPage() {
  const { signup } = useAuth()
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"trainee" | "trainer">("trainee")
  const [organization, setOrganization] = useState("")
  const [designation, setDesignation] = useState("")
  const [expertise, setExpertise] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signup({ name, email, password, requestedRole: role, organization, designation, expertise })
      toast.success("Account created")
      router.push("/")
    } catch (err) {
      setError(getAuthErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <Card className="w-full max-w-md border-border shadow-sm">
        <CardHeader className="space-y-1 text-center">
          <Link
            href="/"
            className="mx-auto mb-2 flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground"
          >
            <ShieldCheck className="size-5" />
          </Link>
          <CardTitle className="text-2xl font-medium">Create your account</CardTitle>
          <CardDescription>Join Capacity Connect as a trainee or trainer</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Sharma" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@department.gov"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="role">I am joining as a</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "trainee" | "trainer")}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trainee">Trainee — I want to build skills</SelectItem>
                  <SelectItem value="trainer">Trainer — I want to deliver courses</SelectItem>
                </SelectContent>
              </Select>
              {role === "trainer" && (
                <p className="text-xs text-muted-foreground">Trainer accounts require admin approval before access.</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="organization">Department / Organization</Label>
              <Input
                id="organization"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g. Ministry of Digital Affairs"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Program Officer"
              />
            </div>
            {role === "trainer" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="expertise">Areas of expertise (comma separated)</Label>
                <Textarea
                  id="expertise"
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                  placeholder="Data Analysis, Communication"
                  rows={2}
                />
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting} className="mt-1 rounded-full" size="lg">
              {submitting ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
