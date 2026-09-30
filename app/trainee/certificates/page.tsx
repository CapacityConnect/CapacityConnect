"use client"

import { useEffect, useState } from "react"
import { Award, ShieldCheck } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { listCertificatesForUser } from "@/lib/firebase/certificates"
import { formatDate } from "@/lib/format"
import type { Certificate } from "@/lib/types"

export default function CertificatesPage() {
  const { appUser } = useAuth()
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!appUser) return
    let mounted = true
    listCertificatesForUser(appUser.uid).then((data) => {
      if (mounted) {
        setCertificates(data)
        setLoading(false)
      }
    })
    return () => {
      mounted = false
    }
  }, [appUser])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Certificates</h1>
        <p className="text-sm text-muted-foreground">Certificates earned by completing courses.</p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : certificates.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Complete a course to earn your first certificate.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {certificates.map((cert) => (
            <Card key={cert.id} className="overflow-hidden border-primary/20">
              <div className="h-1.5 w-full bg-gradient-to-r from-primary to-accent" />
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Award className="size-5" />
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(cert.issuedAt)}</span>
                </div>
                <p className="font-semibold leading-tight">{cert.courseTitle}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="size-3.5" /> Certificate ID: {cert.certId}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
