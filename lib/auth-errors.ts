export function getAuthErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? ""
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
    return "Invalid email or password."
  }
  if (code.includes("email-already-in-use")) return "An account with this email already exists."
  if (code.includes("weak-password")) return "Password should be at least 6 characters."
  if (code.includes("too-many-requests")) return "Too many attempts. Please try again later."
  return "Something went wrong. Please try again."
}
