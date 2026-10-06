"use client"

import { getMessaging, getToken, onMessage, isSupported, type Messaging } from "firebase/messaging"
import { arrayRemove, arrayUnion, doc, updateDoc } from "firebase/firestore"
import { db, firebaseApp } from "@/lib/firebase/config"

let messagingPromise: Promise<Messaging | null> | null = null

function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === "undefined") return Promise.resolve(null)
  if (!messagingPromise) {
    messagingPromise = isSupported()
      .then((supported) => (supported ? getMessaging(firebaseApp) : null))
      .catch(() => null)
  }
  return messagingPromise
}

export async function isPushSupported(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("Notification" in window)) {
    return false
  }
  return (await getMessagingInstance()) !== null
}

export function getPushPermissionState(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported"
  return Notification.permission
}

export async function enablePushNotifications(uid: string): Promise<{ ok: boolean; reason?: string }> {
  const messaging = await getMessagingInstance()
  if (!messaging) {
    return { ok: false, reason: "Push notifications aren't supported in this browser." }
  }

  const permission = await Notification.requestPermission()
  if (permission !== "granted") {
    return { ok: false, reason: "Notification permission was denied." }
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js")
  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  })
  if (!token) {
    return { ok: false, reason: "Could not generate a push token for this device." }
  }

  await updateDoc(doc(db, "users", uid), { fcmTokens: arrayUnion(token) })
  return { ok: true }
}

export async function disablePushNotifications(uid: string): Promise<void> {
  const messaging = await getMessagingInstance()
  if (!messaging || typeof navigator === "undefined") return
  const registration = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js")
  if (!registration) return
  try {
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
    if (token) await updateDoc(doc(db, "users", uid), { fcmTokens: arrayRemove(token) })
  } catch {
    // Token may already be invalid/expired - nothing to clean up client-side.
  }
}

// Foreground messages (app tab open and focused) don't trigger the service
// worker's onBackgroundMessage, so they're surfaced separately here.
export async function listenForForegroundMessages(
  onReceive: (payload: { title?: string; body?: string; link?: string }) => void,
): Promise<() => void> {
  const messaging = await getMessagingInstance()
  if (!messaging) return () => {}
  return onMessage(messaging, (payload) => {
    onReceive({
      title: payload.notification?.title,
      body: payload.notification?.body,
      link: (payload.data as Record<string, string> | undefined)?.link,
    })
  })
}
