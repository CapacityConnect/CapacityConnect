export type Role = "trainee" | "trainer" | "admin"
export type UserStatus = "pending" | "approved" | "rejected"

export interface Qualification {
  id: string
  degree: string
  institution: string
  year: string
}

export interface WorkExperience {
  id: string
  title: string
  organization: string
  duration: string
  description?: string
}

export interface AppUser {
  uid: string
  name: string
  email: string
  role: Role
  status: UserStatus
  organization?: string
  designation?: string
  expertise?: string[]
  experienceYears?: number
  qualifications?: string
  education?: Qualification[]
  workExperience?: WorkExperience[]
  interests?: string[]
  skills?: string[]
  fcmTokens?: string[]
  createdAt: number
}

export interface CompetencyScore {
  current: number
  target: number
  updatedAt: number
}

export interface CompetencyRecord {
  userId: string
  scores: Record<string, CompetencyScore>
  updatedAt: number
}

export interface CourseModule {
  id: string
  title: string
  order: number
  summary: string
}

export interface Course {
  id: string
  title: string
  description: string
  competency: string
  trainerId: string
  trainerName: string
  difficulty: "Beginner" | "Intermediate" | "Advanced"
  durationHours: number
  modules: CourseModule[]
  enrollmentCount: number
  // Drafts are only visible to their trainer and admins. Legacy documents
  // without the field are treated as published.
  published?: boolean
  createdAt: number
}

export function isCoursePublished(course: Pick<Course, "published">) {
  return course.published !== false
}

export type LibraryResourceCategory = "recorded-lecture" | "presentation" | "study-material"

export interface LibraryResource {
  id: string
  title: string
  description?: string
  category: LibraryResourceCategory
  fileName: string
  fileType: string
  fileSize: number
  url: string
  uploadedBy: string
  uploadedByName: string
  createdAt: number
  // Flags a resource as a vetted, org-wide institutional knowledge asset
  // (vs. an ordinary upload). Set by the uploading trainer or an admin.
  isInstitutionalKnowledge?: boolean
}

export interface Resource {
  id: string
  courseId: string
  moduleId?: string
  title: string
  fileName: string
  fileType: string
  fileSize: number
  url: string
  uploadedBy: string
  uploadedByName: string
  createdAt: number
}

export interface Enrollment {
  id: string
  userId: string
  courseId: string
  progress: number
  completedModules: string[]
  status: "in-progress" | "completed"
  enrolledAt: number
  completedAt?: number
}

// Trainee-readable question shape — deliberately has no correctIndex/explanation.
// The answer key lives in `assessmentKeys/{assessmentId}`, which only the
// course trainer and admins can read. Trainees never read it; grading happens
// on the server (app/api/assessments/[id]/submit) with the Admin SDK.
export interface AssessmentQuestion {
  id: string
  text: string
  options: string[]
}

// Input shape used when a trainer authors/edits questions — includes the
// answer key fields that get split off into `assessmentKeys` on save.
export interface AssessmentQuestionDraft {
  id: string
  text: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface Assessment {
  id: string
  courseId: string
  competency: string
  title: string
  deadline?: number
  passMark?: number
  trainerId?: string
  questions: AssessmentQuestion[]
  createdAt: number
}

export interface AssessmentAnswerKeyEntry {
  correctIndex: number
  explanation: string
}

export interface AssessmentAnswerKey {
  id: string
  courseId: string
  trainerId: string
  answers: Record<string, AssessmentAnswerKeyEntry>
}

export interface AttemptReviewItem {
  questionId: string
  chosenIndex: number
  correctIndex: number
  correct: boolean
  explanation: string
}

// Written only by the server after grading against the protected key.
export interface AssessmentAttempt {
  id: string
  assessmentId: string
  courseId: string
  userId: string
  answers: number[]
  review: AttemptReviewItem[]
  passed: boolean
  score: number
  correctCount: number
  totalQuestions: number
  competency: string
  competencyBefore: number
  competencyAfter: number
  improvement: number
  submittedAt: number
}

// Written only by the server after verifying completion + passing attempt.
export interface Certificate {
  id: string
  userId: string
  userName: string
  courseId: string
  courseTitle: string
  trainerId: string
  competency: string
  score: number | null
  certId: string
  issuedAt: number
}

export const DEFAULT_PASS_MARK = 60

export interface AppNotification {
  id: string
  userId: string
  type: "course" | "deadline" | "approval" | "material" | "achievement" | "announcement"
  title: string
  message: string
  read: boolean
  createdAt: number
  link?: string
}

export interface Announcement {
  id: string
  title: string
  message: string
  audience: "all" | "trainee" | "trainer"
  kind: "announcement" | "achievement"
  // When true the announcement is also shown on the public homepage.
  showOnHomepage: boolean
  createdBy: string
  createdAt: number
}

export interface Feedback {
  id: string
  courseId: string
  courseTitle: string
  userId: string
  userName: string
  rating: number
  comment: string
  createdAt: number
}

export const COMPETENCIES = ["Data Analysis", "Communication", "Digital Skills", "Problem Solving", "Leadership"] as const

export type EvidenceStatus = "pending" | "needs-revision" | "verified"

// A trainee-submitted, trainer-verified proof of applied competency (a report,
// deliverable link, or write-up) tied to a specific course/competency. This is
// what turns a completed course into a verified line on the capability
// passport, independent of the assessment score.
export interface Evidence {
  id: string
  userId: string
  userName: string
  courseId: string
  courseTitle: string
  competency: string
  trainerId: string
  title: string
  description: string
  fileUrl?: string
  status: EvidenceStatus
  reviewNote?: string
  reviewedAt?: number
  createdAt: number
}
