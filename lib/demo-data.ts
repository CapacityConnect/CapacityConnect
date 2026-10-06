import type {
  Announcement,
  AppNotification,
  AppUser,
  Assessment,
  AssessmentAttempt,
  Certificate,
  CompetencyRecord,
  Course,
  Enrollment,
  Evidence,
  Feedback,
  LibraryResource,
  Resource,
} from "@/lib/types"
import { COMPETENCIES } from "@/lib/types"

/**
 * Presentation-safe data used only when a Firestore read is unavailable, times
 * out, or returns no records. Keeping it here avoids scattered placeholder JSX
 * and lets the existing dashboard components continue to exercise their normal
 * data paths during a demo.
 */
const DEMO_NOW = Date.UTC(2026, 8, 30, 9, 0, 0)
const DAY = 24 * 60 * 60 * 1000
const DEMO_READ_TIMEOUT_MS = 3500

const clone = <T,>(value: T): T => structuredClone(value)

export async function readWithDemoFallback<T>(
  read: () => Promise<T>,
  fallback: () => T,
  hasUsableData: (value: T) => boolean = (value) => (Array.isArray(value) ? value.length > 0 : value != null),
): Promise<T> {
  try {
    const value = await new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => reject(new Error("Firebase read timed out")), DEMO_READ_TIMEOUT_MS)
      read().then(
        (result) => {
          clearTimeout(timeoutId)
          resolve(result)
        },
        (error) => {
          clearTimeout(timeoutId)
          reject(error)
        },
      )
    })
    return hasUsableData(value) ? value : fallback()
  } catch {
    return fallback()
  }
}

export const DEMO_TRAINERS: AppUser[] = [
  {
    uid: "demo-trainer-1",
    name: "Dr. Ananya Rao",
    email: "ananya.rao@capacityconnect.demo",
    role: "trainer",
    status: "approved",
    organization: "Ministry of Skill Development",
    designation: "Senior Data Analytics Trainer",
    expertise: ["Data Analysis", "Problem Solving"],
    experienceYears: 12,
    qualifications: "Ph.D. in Statistics, IIT Bombay",
    createdAt: DEMO_NOW - 400 * DAY,
  },
  {
    uid: "demo-trainer-2",
    name: "Rakesh Menon",
    email: "rakesh.menon@capacityconnect.demo",
    role: "trainer",
    status: "approved",
    organization: "National Institute of Public Administration",
    designation: "Lead Communications Trainer",
    expertise: ["Communication", "Leadership"],
    experienceYears: 9,
    qualifications: "M.A. Public Policy, TISS Mumbai",
    createdAt: DEMO_NOW - 380 * DAY,
  },
  {
    uid: "demo-trainer-3",
    name: "Priya Nair",
    email: "priya.nair@capacityconnect.demo",
    role: "trainer",
    status: "approved",
    organization: "Digital India Academy",
    designation: "Digital Skills Faculty Lead",
    expertise: ["Digital Skills"],
    experienceYears: 7,
    qualifications: "M.Sc. Computer Applications, Delhi University",
    createdAt: DEMO_NOW - 360 * DAY,
  },
]

export const DEMO_TRAINEES: AppUser[] = [
  {
    uid: "demo-trainee-1",
    name: "Arjun Verma",
    email: "arjun.verma@capacityconnect.demo",
    role: "trainee",
    status: "approved",
    organization: "Department of Revenue",
    designation: "Assistant Section Officer",
    interests: ["Data Analysis", "Problem Solving"],
    skills: ["Excel", "Report Writing"],
    createdAt: DEMO_NOW - 300 * DAY,
  },
  {
    uid: "demo-trainee-2",
    name: "Fatima Sheikh",
    email: "fatima.sheikh@capacityconnect.demo",
    role: "trainee",
    status: "approved",
    organization: "Department of Education",
    designation: "Program Associate",
    interests: ["Communication", "Leadership"],
    skills: ["Facilitation", "Stakeholder Management"],
    createdAt: DEMO_NOW - 280 * DAY,
  },
  {
    uid: "demo-trainee-3",
    name: "Karan Malhotra",
    email: "karan.malhotra@capacityconnect.demo",
    role: "trainee",
    status: "approved",
    organization: "Department of Health",
    designation: "Field Coordinator",
    interests: ["Digital Skills", "Data Analysis"],
    skills: ["Field Surveys", "Data Entry"],
    createdAt: DEMO_NOW - 260 * DAY,
  },
  {
    uid: "demo-trainee-4",
    name: "Sneha Joshi",
    email: "sneha.joshi@capacityconnect.demo",
    role: "trainee",
    status: "approved",
    organization: "Department of Urban Development",
    designation: "Planning Officer",
    interests: ["Problem Solving", "Leadership"],
    skills: ["Urban Planning", "GIS Basics"],
    createdAt: DEMO_NOW - 240 * DAY,
  },
  {
    uid: "demo-trainee-5",
    name: "Rohan Gupta",
    email: "rohan.gupta@capacityconnect.demo",
    role: "trainee",
    status: "approved",
    organization: "Department of Finance",
    designation: "Accounts Officer",
    interests: ["Data Analysis", "Digital Skills"],
    skills: ["Budgeting", "Financial Reporting"],
    createdAt: DEMO_NOW - 220 * DAY,
  },
]

export const DEMO_PENDING_USERS: AppUser[] = [
  {
    uid: "demo-pending-trainer",
    name: "Nisha Kapoor",
    email: "nisha.kapoor@capacityconnect.demo",
    role: "trainer",
    status: "pending",
    organization: "State Institute of Governance",
    designation: "Learning Facilitator",
    expertise: ["Communication", "Leadership"],
    createdAt: DEMO_NOW - 2 * DAY,
  },
]

export const DEMO_COURSES: Course[] = [
  {
    id: "demo-course-data-analysis",
    title: "Data Analysis Fundamentals",
    description: "Build a practical foundation in reading, interpreting, and visualizing data so you can make evidence-based decisions at work.",
    competency: "Data Analysis",
    trainerId: "demo-trainer-1",
    trainerName: "Dr. Ananya Rao",
    difficulty: "Beginner",
    durationHours: 6,
    modules: [
      { id: "m1", title: "Data Analysis Basics", order: 1, summary: "Frame a question, inspect datasets, and use core statistical vocabulary." },
      { id: "m2", title: "Data Interpretation", order: 2, summary: "Read tables and summary statistics to draw sound conclusions." },
      { id: "m3", title: "Data Visualization", order: 3, summary: "Choose charts that communicate the pattern without misleading the audience." },
      { id: "m4", title: "Practical Application", order: 4, summary: "Apply analysis techniques to a realistic service-delivery scenario." },
    ],
    enrollmentCount: 18,
    createdAt: DEMO_NOW - 90 * DAY,
  },
  {
    id: "demo-course-data-storytelling",
    title: "Data Storytelling for Decisions",
    description: "Turn an analysis into a concise briefing that helps leaders act on evidence.",
    competency: "Data Analysis",
    trainerId: "demo-trainer-1",
    trainerName: "Dr. Ananya Rao",
    difficulty: "Intermediate",
    durationHours: 4,
    modules: [
      { id: "m1", title: "Audience-first framing", order: 1, summary: "Start with the decision and the stakeholder question." },
      { id: "m2", title: "Insight narrative", order: 2, summary: "Connect evidence, context, and recommendation in a clear sequence." },
      { id: "m3", title: "Decision briefing", order: 3, summary: "Present trade-offs, risks, and a practical next action." },
    ],
    enrollmentCount: 11,
    createdAt: DEMO_NOW - 45 * DAY,
  },
  {
    id: "demo-course-communication",
    title: "Effective Workplace Communication",
    description: "Sharpen written and verbal communication for institutional and cross-team settings.",
    competency: "Communication",
    trainerId: "demo-trainer-2",
    trainerName: "Rakesh Menon",
    difficulty: "Beginner",
    durationHours: 4,
    modules: [
      { id: "m1", title: "Structuring a Clear Message", order: 1, summary: "Frame intent before writing or speaking." },
      { id: "m2", title: "Active Listening", order: 2, summary: "Confirm understanding in meetings and reviews." },
      { id: "m3", title: "Presenting to Stakeholders", order: 3, summary: "Structure a concise, persuasive briefing." },
    ],
    enrollmentCount: 24,
    createdAt: DEMO_NOW - 120 * DAY,
  },
  {
    id: "demo-course-digital-skills",
    title: "Digital Tools for Government Teams",
    description: "Practical fluency with spreadsheets, document collaboration, and secure digital workflows.",
    competency: "Digital Skills",
    trainerId: "demo-trainer-3",
    trainerName: "Priya Nair",
    difficulty: "Intermediate",
    durationHours: 5,
    modules: [
      { id: "m1", title: "Spreadsheet Fundamentals", order: 1, summary: "Formulas, filters, and pivot basics." },
      { id: "m2", title: "Collaborative Documents", order: 2, summary: "Version control and structured review cycles." },
      { id: "m3", title: "Digital Hygiene & Security", order: 3, summary: "Safe data handling for institutional systems." },
    ],
    enrollmentCount: 17,
    createdAt: DEMO_NOW - 75 * DAY,
  },
  {
    id: "demo-course-problem-solving",
    title: "Structured Problem Solving",
    description: "A repeatable framework for diagnosing root causes and evaluating solution trade-offs.",
    competency: "Problem Solving",
    trainerId: "demo-trainer-1",
    trainerName: "Dr. Ananya Rao",
    difficulty: "Intermediate",
    durationHours: 5,
    modules: [
      { id: "m1", title: "Root Cause Analysis", order: 1, summary: "The 5-whys and fishbone techniques." },
      { id: "m2", title: "Option Evaluation", order: 2, summary: "Weigh trade-offs with a decision matrix." },
      { id: "m3", title: "Implementation Planning", order: 3, summary: "Turn a decision into a tracked action plan." },
    ],
    enrollmentCount: 14,
    createdAt: DEMO_NOW - 60 * DAY,
  },
  {
    id: "demo-course-leadership",
    title: "Foundations of Team Leadership",
    description: "Core leadership habits for first-time team leads in institutional settings.",
    competency: "Leadership",
    trainerId: "demo-trainer-2",
    trainerName: "Rakesh Menon",
    difficulty: "Advanced",
    durationHours: 7,
    modules: [
      { id: "m1", title: "Delegation & Accountability", order: 1, summary: "Assign ownership without micromanaging." },
      { id: "m2", title: "Giving Feedback", order: 2, summary: "Lead constructive, timely feedback conversations." },
      { id: "m3", title: "Leading Through Change", order: 3, summary: "Communicate change with clarity and empathy." },
    ],
    enrollmentCount: 9,
    createdAt: DEMO_NOW - 50 * DAY,
  },
]

const DATA_ANALYSIS_QUESTIONS: Assessment["questions"] = [
  { id: "q1", text: "Which measure best describes the typical value in a dataset with extreme outliers?", options: ["Mean", "Median", "Range", "Standard deviation"] },
  { id: "q2", text: "Which chart type is best for showing a trend over time?", options: ["Pie chart", "Line chart", "Scatter plot", "Bar chart"] },
  { id: "q3", text: "What is the best first step before analyzing a new dataset?", options: ["Build the final chart", "Check for missing values and data quality", "Delete all outliers", "Present it immediately"] },
  { id: "q4", text: "A pivot table is most useful for:", options: ["Writing narratives", "Summarizing data across dimensions", "Sending emails", "Storing raw text"] },
  { id: "q5", text: "When presenting data insights, you should:", options: ["Use more jargon", "Lead with the key takeaway", "Show every raw table", "Avoid a recommendation"] },
]

const GENERIC_QUESTIONS: Assessment["questions"] = [
  { id: "q1", text: "Before an important communication, what should you clarify first?", options: ["Font choice", "Intent and audience", "Meeting room", "File format"] },
  { id: "q2", text: "Active listening is best demonstrated by:", options: ["Interrupting", "Paraphrasing what you heard", "Changing topic", "Staying silent"] },
  { id: "q3", text: "A stakeholder briefing should generally:", options: ["Lead with the key takeaway", "Hide the conclusion", "Use no structure", "Avoid a clear ask"] },
]

export const DEMO_ASSESSMENTS: Assessment[] = DEMO_COURSES.map((course) => ({
  id: `demo-assessment-${course.id.replace("demo-course-", "")}`,
  courseId: course.id,
  competency: course.competency,
  title: `${course.title} — Final Assessment`,
  deadline: DEMO_NOW + 14 * DAY,
  passMark: 60,
  trainerId: course.trainerId,
  questions: course.competency === "Data Analysis" ? DATA_ANALYSIS_QUESTIONS : GENERIC_QUESTIONS,
  createdAt: course.createdAt + DAY,
}))

export const DEMO_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "demo-announcement-learning-path",
    title: "Your personalized learning path is ready",
    message: "Start with your priority competency gap, complete the recommended learning, and submit evidence for verification.",
    audience: "trainee",
    kind: "announcement",
    showOnHomepage: true,
    createdBy: "demo-admin",
    createdAt: DEMO_NOW - DAY,
  },
  {
    id: "demo-announcement-data-cohort",
    title: "New Data Analysis cohort opens this week",
    message: "Data Storytelling for Decisions is now available for learners ready to turn insights into action.",
    audience: "all",
    kind: "announcement",
    showOnHomepage: true,
    createdBy: "demo-admin",
    createdAt: DEMO_NOW - 3 * DAY,
  },
  {
    id: "demo-announcement-evidence",
    title: "Evidence review window",
    message: "Trainers: review pending workplace evidence so learner readiness records stay current.",
    audience: "trainer",
    kind: "announcement",
    showOnHomepage: false,
    createdBy: "demo-admin",
    createdAt: DEMO_NOW - 5 * DAY,
  },
]

const BASE_SCORES: CompetencyRecord["scores"] = {
  "Data Analysis": { current: 42, target: 75, updatedAt: DEMO_NOW - DAY },
  Communication: { current: 78, target: 82, updatedAt: DEMO_NOW - DAY },
  "Digital Skills": { current: 64, target: 78, updatedAt: DEMO_NOW - DAY },
  "Problem Solving": { current: 70, target: 80, updatedAt: DEMO_NOW - DAY },
  Leadership: { current: 58, target: 72, updatedAt: DEMO_NOW - DAY },
}

export function getDemoCompetencyRecord(userId: string): CompetencyRecord {
  return { userId, scores: clone(BASE_SCORES), updatedAt: DEMO_NOW - DAY }
}

export function getDemoCompetencyRecords(): CompetencyRecord[] {
  const scoreOffsets = [0, 5, -4, 7, 2]
  return DEMO_TRAINEES.map((trainee, index) => {
    const scores = clone(BASE_SCORES)
    for (const competency of COMPETENCIES) {
      const entry = scores[competency]
      entry.current = Math.min(entry.target - 2, Math.max(35, entry.current + scoreOffsets[index]))
    }
    return { userId: trainee.uid, scores, updatedAt: DEMO_NOW - (index + 1) * DAY }
  })
}

export function getDemoCompetencyDemand(): Record<string, { traineeCount: number; avgGap: number }> {
  const totals: Record<string, { total: number; count: number }> = {}
  for (const record of getDemoCompetencyRecords()) {
    for (const [competency, score] of Object.entries(record.scores)) {
      const gap = score.target - score.current
      if (gap <= 0) continue
      totals[competency] ??= { total: 0, count: 0 }
      totals[competency].total += gap
      totals[competency].count += 1
    }
  }
  return Object.fromEntries(
    Object.entries(totals).map(([competency, values]) => [competency, { traineeCount: values.count, avgGap: Math.round(values.total / values.count) }]),
  )
}

export function getDemoCourses(): Course[] {
  return clone(DEMO_COURSES)
}

export function getDemoCourse(courseId: string): Course | null {
  return clone(DEMO_COURSES.find((course) => course.id === courseId) ?? null)
}

export function getDemoCoursesByCompetency(competency: string): Course[] {
  return clone(DEMO_COURSES.filter((course) => course.competency === competency))
}

export function getDemoCoursesForTrainer(trainerId: string): Course[] {
  return clone(
    DEMO_COURSES.filter((course) => course.trainerId === "demo-trainer-1").map((course) => ({ ...course, trainerId })),
  )
}

export function getDemoEnrollmentsForUser(userId: string): Enrollment[] {
  return [
    {
      id: `${userId}_demo-course-data-analysis`,
      userId,
      courseId: "demo-course-data-analysis",
      progress: 75,
      completedModules: ["m1", "m2", "m3"],
      status: "in-progress",
      enrolledAt: DEMO_NOW - 21 * DAY,
    },
    {
      id: `${userId}_demo-course-communication`,
      userId,
      courseId: "demo-course-communication",
      progress: 100,
      completedModules: ["m1", "m2", "m3"],
      status: "completed",
      enrolledAt: DEMO_NOW - 50 * DAY,
      completedAt: DEMO_NOW - 18 * DAY,
    },
  ]
}

export function getDemoEnrollmentsForCourse(courseId: string): Enrollment[] {
  const learnerIds = DEMO_TRAINEES.slice(0, 3).map((trainee) => trainee.uid)
  return learnerIds.map((userId, index) => {
    const complete = index !== 1
    const course = getDemoCourse(courseId)
    return {
      id: `${userId}_${courseId}`,
      userId,
      courseId,
      progress: complete ? 100 : 68,
      completedModules: course?.modules.slice(0, complete ? course.modules.length : 2).map((module) => module.id) ?? [],
      status: complete ? "completed" : "in-progress",
      enrolledAt: DEMO_NOW - (30 + index * 4) * DAY,
      ...(complete ? { completedAt: DEMO_NOW - (10 + index) * DAY } : {}),
    }
  })
}

export function getDemoEnrollment(userId: string, courseId: string): Enrollment | null {
  return getDemoEnrollmentsForUser(userId).find((enrollment) => enrollment.courseId === courseId) ?? null
}

export function getDemoAssessment(assessmentId: string): Assessment | null {
  return clone(DEMO_ASSESSMENTS.find((assessment) => assessment.id === assessmentId) ?? null)
}

export function getDemoAssessmentForCourse(courseId: string): Assessment | null {
  return clone(DEMO_ASSESSMENTS.find((assessment) => assessment.courseId === courseId) ?? null)
}

function buildAttempt(userId: string, assessment: Assessment, score: number, submittedAt: number): AssessmentAttempt {
  const totalQuestions = assessment.questions.length
  const correctCount = Math.round((score / 100) * totalQuestions)
  return {
    id: `${userId}_${assessment.id}`,
    assessmentId: assessment.id,
    courseId: assessment.courseId,
    userId,
    answers: assessment.questions.map((_, index) => (index < correctCount ? 1 : 0)),
    review: assessment.questions.map((question, index) => ({
      questionId: question.id,
      chosenIndex: index < correctCount ? 1 : 0,
      correctIndex: 1,
      correct: index < correctCount,
      explanation: "This demo review shows how assessment feedback supports the next learning action.",
    })),
    passed: score >= 60,
    score,
    correctCount,
    totalQuestions,
    competency: assessment.competency,
    competencyBefore: assessment.competency === "Communication" ? 70 : 42,
    competencyAfter: assessment.competency === "Communication" ? 78 : 50,
    improvement: assessment.competency === "Communication" ? 8 : 8,
    submittedAt,
  }
}

export function getDemoAttempt(assessmentId: string, userId: string): AssessmentAttempt | null {
  const assessment = getDemoAssessment(assessmentId)
  if (!assessment || assessment.courseId !== "demo-course-communication") return null
  return buildAttempt(userId, assessment, 100, DEMO_NOW - 16 * DAY)
}

export function getDemoAttemptsForAssessment(assessmentId: string): AssessmentAttempt[] {
  const assessment = getDemoAssessment(assessmentId)
  if (!assessment) return []
  return DEMO_TRAINEES.slice(0, 3).map((trainee, index) => buildAttempt(trainee.uid, assessment, [80, 100, 60][index], DEMO_NOW - (8 + index) * DAY))
}

export function getDemoCertificatesForUser(userId: string): Certificate[] {
  const course = getDemoCourse("demo-course-communication")!
  return [
    {
      id: `${userId}_${course.id}`,
      userId,
      userName: "Demo learner",
      courseId: course.id,
      courseTitle: course.title,
      trainerId: course.trainerId,
      competency: course.competency,
      score: 100,
      certId: "CC-COMM-2026-042",
      issuedAt: DEMO_NOW - 15 * DAY,
    },
  ]
}

export function getDemoAllCertificates(): Certificate[] {
  return DEMO_TRAINEES.slice(0, 4).map((trainee, index) => ({
    ...getDemoCertificatesForUser(trainee.uid)[0],
    userName: trainee.name,
    certId: `CC-COMM-2026-0${42 + index}`,
    issuedAt: DEMO_NOW - (15 + index) * DAY,
  }))
}

export function getDemoEvidenceForUser(userId: string): Evidence[] {
  return [
    {
      id: `${userId}-demo-evidence-verified`,
      userId,
      userName: "Demo learner",
      courseId: "demo-course-communication",
      courseTitle: "Effective Workplace Communication",
      competency: "Communication",
      trainerId: "demo-trainer-2",
      title: "Stakeholder briefing — workplace application",
      description: "Prepared a concise cross-department briefing with a clear decision request and explicit owners.",
      status: "verified",
      reviewNote: "Clear structure and a measurable outcome. Verified.",
      reviewedAt: DEMO_NOW - 12 * DAY,
      createdAt: DEMO_NOW - 14 * DAY,
    },
    {
      id: `${userId}-demo-evidence-pending`,
      userId,
      userName: "Demo learner",
      courseId: "demo-course-data-analysis",
      courseTitle: "Data Analysis Fundamentals",
      competency: "Data Analysis",
      trainerId: "demo-trainer-1",
      title: "Monthly service dashboard — workplace application",
      description: "Used a cleaned service-request dataset to identify turnaround-time patterns and present a recommended action.",
      status: "pending",
      createdAt: DEMO_NOW - 2 * DAY,
    },
  ]
}

export function getDemoEvidenceForTrainer(trainerId: string): Evidence[] {
  return [
    {
      ...getDemoEvidenceForUser("demo-trainee-1")[1],
      userId: "demo-trainee-1",
      userName: "Arjun Verma",
      trainerId,
    },
    {
      id: "demo-evidence-needs-revision",
      userId: "demo-trainee-3",
      userName: "Karan Malhotra",
      courseId: "demo-course-data-storytelling",
      courseTitle: "Data Storytelling for Decisions",
      competency: "Data Analysis",
      trainerId,
      title: "District performance note",
      description: "Drafted a short insight note from district performance data and shared the proposed action.",
      status: "needs-revision",
      reviewNote: "Please add the measured impact and cite the chart source before resubmitting.",
      reviewedAt: DEMO_NOW - DAY,
      createdAt: DEMO_NOW - 5 * DAY,
    },
    {
      id: "demo-evidence-verified",
      userId: "demo-trainee-2",
      userName: "Fatima Sheikh",
      courseId: "demo-course-problem-solving",
      courseTitle: "Structured Problem Solving",
      competency: "Problem Solving",
      trainerId,
      title: "Root-cause review for delayed approvals",
      description: "Mapped the approval bottleneck, tested causes with a small dataset, and proposed a tracked follow-up action.",
      status: "verified",
      reviewNote: "Sound analysis and clear recommendation. Verified.",
      reviewedAt: DEMO_NOW - 7 * DAY,
      createdAt: DEMO_NOW - 9 * DAY,
    },
  ]
}

const DEMO_FEEDBACK: Feedback[] = [
  { id: "demo-feedback-1", courseId: "demo-course-data-analysis", courseTitle: "Data Analysis Fundamentals", userId: "demo-trainee-1", userName: "Arjun Verma", rating: 5, comment: "The practical dashboard exercise made the data quality checks immediately useful.", createdAt: DEMO_NOW - 4 * DAY },
  { id: "demo-feedback-2", courseId: "demo-course-data-storytelling", courseTitle: "Data Storytelling for Decisions", userId: "demo-trainee-3", userName: "Karan Malhotra", rating: 4, comment: "The briefing structure helped me make a clearer recommendation to my manager.", createdAt: DEMO_NOW - 6 * DAY },
  { id: "demo-feedback-3", courseId: "demo-course-problem-solving", courseTitle: "Structured Problem Solving", userId: "demo-trainee-2", userName: "Fatima Sheikh", rating: 5, comment: "The decision matrix was practical and easy to apply to a real workflow problem.", createdAt: DEMO_NOW - 10 * DAY },
]

export function getDemoFeedbackForCourse(courseId: string): Feedback[] {
  return clone(DEMO_FEEDBACK.filter((feedback) => feedback.courseId === courseId))
}

export function getDemoTrainerFeedback(): Feedback[] {
  return clone(DEMO_FEEDBACK)
}

export function getDemoUsers(): AppUser[] {
  return clone([...DEMO_TRAINERS, ...DEMO_TRAINEES, ...DEMO_PENDING_USERS])
}

export function getDemoPendingUsers(): AppUser[] {
  return clone(DEMO_PENDING_USERS)
}

export function getDemoUsersByRole(role: AppUser["role"]): AppUser[] {
  return getDemoUsers().filter((user) => user.role === role)
}

export function getDemoResourcesForCourse(courseId: string): Resource[] {
  const course = getDemoCourse(courseId)
  if (!course) return []
  return [
    {
      id: `${courseId}-resource-workbook`,
      courseId,
      title: `${course.competency} practice workbook`,
      fileName: `${course.competency.toLowerCase().replaceAll(" ", "-")}-workbook.pdf`,
      fileType: "application/pdf",
      fileSize: 1_248_000,
      url: "https://www.data.gov.in/",
      uploadedBy: course.trainerId,
      uploadedByName: course.trainerName,
      createdAt: DEMO_NOW - 7 * DAY,
    },
  ]
}

export const DEMO_LIBRARY_RESOURCES: LibraryResource[] = [
  {
    id: "demo-library-data-lecture",
    title: "Reading data before drawing conclusions",
    description: "Recorded session on data quality checks, summary statistics, and responsible interpretation.",
    category: "recorded-lecture",
    fileName: "reading-data-session.mp4",
    fileType: "video/mp4",
    fileSize: 84_000_000,
    url: "https://support.microsoft.com/en-us/excel",
    uploadedBy: "demo-trainer-1",
    uploadedByName: "Dr. Ananya Rao",
    createdAt: DEMO_NOW - 4 * DAY,
    isInstitutionalKnowledge: true,
  },
  {
    id: "demo-library-briefing-template",
    title: "Evidence-based briefing template",
    description: "A reusable structure for leading with an insight, supporting it with evidence, and ending with a clear request.",
    category: "presentation",
    fileName: "evidence-based-briefing-template.pptx",
    fileType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    fileSize: 2_400_000,
    url: "https://www.data.gov.in/",
    uploadedBy: "demo-trainer-2",
    uploadedByName: "Rakesh Menon",
    createdAt: DEMO_NOW - 8 * DAY,
    isInstitutionalKnowledge: true,
  },
  {
    id: "demo-library-root-cause-guide",
    title: "Root-cause analysis field guide",
    description: "A practical reference for the 5-whys, fishbone diagrams, and selecting a measurable follow-up action.",
    category: "study-material",
    fileName: "root-cause-analysis-field-guide.pdf",
    fileType: "application/pdf",
    fileSize: 780_000,
    url: "https://support.microsoft.com/en-us/excel",
    uploadedBy: "demo-trainer-1",
    uploadedByName: "Dr. Ananya Rao",
    createdAt: DEMO_NOW - 12 * DAY,
  },
]

export function getDemoLibraryResources(): LibraryResource[] {
  return clone(DEMO_LIBRARY_RESOURCES)
}

export function getDemoNotificationsForUser(userId: string): AppNotification[] {
  return [
    {
      id: `${userId}-notification-path`,
      userId,
      type: "course",
      title: "Keep building your Data Analysis capability",
      message: "Complete the final practical module, then take the assessment to update your competency score.",
      read: false,
      createdAt: DEMO_NOW - DAY,
      link: "/trainee/courses/demo-course-data-analysis",
    },
    {
      id: `${userId}-notification-evidence`,
      userId,
      type: "achievement",
      title: "Evidence verified",
      message: "Your stakeholder briefing has been verified and added to your Capability Passport.",
      read: true,
      createdAt: DEMO_NOW - 12 * DAY,
      link: "/trainee/certificates",
    },
  ]
}
