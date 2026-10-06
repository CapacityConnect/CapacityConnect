"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase/config"
import type { AppUser, Role } from "@/lib/types"

interface SignupInput {
  name: string
  email: string
  password: string
  requestedRole: "trainee" | "trainer"
  organization?: string
  designation?: string
  expertise?: string
}

interface AuthContextValue {
  firebaseUser: FirebaseUser | null
  appUser: AppUser | null
  loading: boolean
  signup: (input: SignupInput) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshAppUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadAppUser(uid: string) {
    try {
      const snap = await getDoc(doc(db, "users", uid))
      if (snap.exists()) {
        setAppUser(snap.data() as AppUser)
      } else {
        setAppUser(null)
      }
    } catch {
      setAppUser(null)
    }
  }

  useEffect(() => {
    const fallbackTimer = setTimeout(() => setLoading(false), 3500)
    const unsub = onAuthStateChanged(auth, async (user) => {
      clearTimeout(fallbackTimer)
      setFirebaseUser(user)
      try {
        if (user) {
          await loadAppUser(user.uid)
        } else {
          setAppUser(null)
        }
      } finally {
        setLoading(false)
      }
    }, () => {
      clearTimeout(fallbackTimer)
      setFirebaseUser(null)
      setAppUser(null)
      setLoading(false)
    })
    return () => {
      clearTimeout(fallbackTimer)
      unsub()
    }
  }, [])

  async function signup(input: SignupInput) {
    const cred = await createUserWithEmailAndPassword(auth, input.email, input.password)
    await updateProfile(cred.user, { displayName: input.name })

    // Force a fresh ID token so Firestore's connection has authenticated
    // credentials before the very next request. Immediately after
    // createUserWithEmailAndPassword, the SDK's token can take a moment to
    // propagate, which would otherwise cause a transient permission-denied.
    await cred.user.getIdToken(true)

    // Trainees are auto-approved; trainer requests need admin approval.
    // Admin accounts are never created through signup — see
    // /api/auth/bootstrap-admin and the Firestore rules for `users`.
    const role: Role = input.requestedRole === "trainer" ? "trainer" : "trainee"
    const status = role === "trainee" ? "approved" : "pending"

    const newUser: AppUser = {
      uid: cred.user.uid,
      name: input.name,
      email: input.email,
      role,
      status,
      organization: input.organization ?? "",
      designation: input.designation ?? "",
      expertise: input.expertise ? input.expertise.split(",").map((s) => s.trim()).filter(Boolean) : [],
      createdAt: Date.now(),
    }
    await setDoc(doc(db, "users", cred.user.uid), newUser)
    setAppUser(newUser)

    if (role === "trainer" && status === "pending") {
      // Best-effort: let admins know a trainer is waiting for approval.
      // Notification documents can't be created client-side, so this goes
      // through a trusted server route.
      const token = await cred.user.getIdToken()
      fetch("/api/users/notify-trainer-signup", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
  }

  async function login(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    await loadAppUser(cred.user.uid)
  }

  async function logout() {
    await firebaseSignOut(auth)
    setAppUser(null)
  }

  async function refreshAppUser() {
    if (firebaseUser) await loadAppUser(firebaseUser.uid)
  }

  return (
    <AuthContext.Provider value={{ firebaseUser, appUser, loading, signup, login, logout, refreshAppUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
