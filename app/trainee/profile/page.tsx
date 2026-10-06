"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Award, GraduationCap, Plus, Sparkles, Star, Trash2, X } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { updateUserProfile } from "@/lib/firebase/users"
import { listCertificatesForUser } from "@/lib/firebase/certificates"
import { listFeedbackByUser } from "@/lib/firebase/feedback"
import { PushNotificationToggle } from "@/components/push-notification-toggle"
import type { Certificate, Feedback, Qualification, WorkExperience } from "@/lib/types"

function TagEditor({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState("")

  function addTag() {
    const v = draft.trim()
    if (!v || values.includes(v)) {
      setDraft("")
      return
    }
    onChange([...values, v])
    setDraft("")
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <Badge key={v} variant="secondary" className="gap-1 pr-1">
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              aria-label={`Remove ${v}`}
              className="rounded-full p-0.5 hover:bg-background/60"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              addTag()
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" onClick={addTag}>
          Add
        </Button>
      </div>
    </div>
  )
}

export default function TraineeProfilePage() {
  const { appUser, refreshAppUser } = useAuth()
  const [name, setName] = useState(appUser?.name ?? "")
  const [organization, setOrganization] = useState(appUser?.organization ?? "")
  const [designation, setDesignation] = useState(appUser?.designation ?? "")
  const [education, setEducation] = useState<Qualification[]>(appUser?.education ?? [])
  const [workExperience, setWorkExperience] = useState<WorkExperience[]>(appUser?.workExperience ?? [])
  const [skills, setSkills] = useState<string[]>(appUser?.skills ?? [])
  const [interests, setInterests] = useState<string[]>(appUser?.interests ?? [])
  const [saving, setSaving] = useState(false)
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [feedback, setFeedback] = useState<Feedback[]>([])

  useEffect(() => {
    if (!appUser) return
    Promise.all([listCertificatesForUser(appUser.uid), listFeedbackByUser(appUser.uid)]).then(([c, f]) => {
      setCertificates(c)
      setFeedback(f)
    })
  }, [appUser])

  function addEducation() {
    setEducation([...education, { id: crypto.randomUUID(), degree: "", institution: "", year: "" }])
  }

  function addExperience() {
    setWorkExperience([
      ...workExperience,
      { id: crypto.randomUUID(), title: "", organization: "", duration: "", description: "" },
    ])
  }

  async function handleSave() {
    if (!appUser) return
    setSaving(true)
    await updateUserProfile(appUser.uid, {
      name,
      organization,
      designation,
      education,
      workExperience,
      skills,
      interests,
    })
    await refreshAppUser()
    setSaving(false)
    toast.success("Profile updated")
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-serif font-semibold">Profile & career details</h1>
        <p className="text-sm text-muted-foreground">
          Build out your professional profile — qualifications, experience, interests, and skills.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={appUser?.email ?? ""} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="designation">Designation</Label>
                  <Input id="designation" value={designation} onChange={(e) => setDesignation(e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="org">Organization / department</Label>
                  <Input id="org" value={organization} onChange={(e) => setOrganization(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Qualifications</CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={addEducation}>
                <Plus className="size-3.5" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {education.length === 0 && (
                <p className="text-sm text-muted-foreground">No qualifications added yet.</p>
              )}
              {education.map((q, i) => (
                <div key={q.id} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_1fr_100px_auto]">
                  <Input
                    placeholder="Degree / certification"
                    value={q.degree}
                    onChange={(e) => {
                      const next = [...education]
                      next[i] = { ...q, degree: e.target.value }
                      setEducation(next)
                    }}
                  />
                  <Input
                    placeholder="Institution"
                    value={q.institution}
                    onChange={(e) => {
                      const next = [...education]
                      next[i] = { ...q, institution: e.target.value }
                      setEducation(next)
                    }}
                  />
                  <Input
                    placeholder="Year"
                    value={q.year}
                    onChange={(e) => {
                      const next = [...education]
                      next[i] = { ...q, year: e.target.value }
                      setEducation(next)
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setEducation(education.filter((x) => x.id !== q.id))}
                    aria-label="Remove qualification"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Work experience</CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={addExperience}>
                <Plus className="size-3.5" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {workExperience.length === 0 && (
                <p className="text-sm text-muted-foreground">No work experience added yet.</p>
              )}
              {workExperience.map((w, i) => (
                <div key={w.id} className="space-y-2 rounded-md border border-border p-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_1fr_140px_auto]">
                    <Input
                      placeholder="Role / title"
                      value={w.title}
                      onChange={(e) => {
                        const next = [...workExperience]
                        next[i] = { ...w, title: e.target.value }
                        setWorkExperience(next)
                      }}
                    />
                    <Input
                      placeholder="Organization"
                      value={w.organization}
                      onChange={(e) => {
                        const next = [...workExperience]
                        next[i] = { ...w, organization: e.target.value }
                        setWorkExperience(next)
                      }}
                    />
                    <Input
                      placeholder="e.g. 2019 – 2023"
                      value={w.duration}
                      onChange={(e) => {
                        const next = [...workExperience]
                        next[i] = { ...w, duration: e.target.value }
                        setWorkExperience(next)
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setWorkExperience(workExperience.filter((x) => x.id !== w.id))}
                      aria-label="Remove experience"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Key responsibilities (optional)"
                    value={w.description}
                    rows={2}
                    onChange={(e) => {
                      const next = [...workExperience]
                      next[i] = { ...w, description: e.target.value }
                      setWorkExperience(next)
                    }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Skills & interests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <TagEditor label="Skills" values={skills} onChange={setSkills} placeholder="e.g. Excel, GIS mapping" />
              <TagEditor
                label="Learning interests"
                values={interests}
                onChange={setInterests}
                placeholder="e.g. Public policy, Data visualization"
              />
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="w-fit">
            Save changes
          </Button>
        </div>

        <div className="flex flex-col gap-6">
          <PushNotificationToggle />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="size-4 text-accent" /> Certificates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {certificates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Complete a course to earn your first certificate.</p>
              ) : (
                certificates.slice(0, 4).map((c) => (
                  <div key={c.id} className="rounded-md border border-border p-2.5 text-sm">
                    <p className="font-medium">{c.courseTitle}</p>
                    <p className="text-xs text-muted-foreground">{c.certId}</p>
                  </div>
                ))
              )}
              <Button
                render={<Link href="/trainee/certificates" />}
                variant="outline"
                size="sm"
                className="w-full"
              >
                View all certificates
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-accent" /> Your feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {feedback.length === 0 ? (
                <p className="text-sm text-muted-foreground">Feedback you submit on completed courses will appear here.</p>
              ) : (
                feedback.map((f) => (
                  <div key={f.id} className="rounded-md border border-border p-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{f.courseTitle}</p>
                      <span className="flex items-center gap-0.5 text-xs">
                        <Star className="size-3 fill-accent text-accent" /> {f.rating}
                      </span>
                    </div>
                    {f.comment && <p className="mt-1 text-xs text-muted-foreground">{f.comment}</p>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="size-4 text-accent" /> Profile completeness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {[education.length > 0, workExperience.length > 0, skills.length > 0, interests.length > 0].filter(Boolean)
                  .length}
                /4 sections completed
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
