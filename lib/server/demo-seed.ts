import "server-only"
import { adminDb } from "@/lib/server/firebase-admin"
import type {
  Announcement,
  AppNotification,
  AppUser,
  Assessment,
  AssessmentAnswerKey,
  AssessmentAttempt,
  AssessmentQuestionDraft,
  AttemptReviewItem,
  Certificate,
  Course,
  CompetencyRecord,
  Enrollment,
  Evidence,
  Feedback,
} from "@/lib/types"
import { COMPETENCIES } from "@/lib/types"

const DAY = 24 * 60 * 60 * 1000

interface QuestionSet {
  title: string
  questions: AssessmentQuestionDraft[]
}

// Generic, competency-flavored 5-question pools used for the courses that
// don't need the full 10-question Data Analysis set below.
const QUESTION_SETS: Record<string, QuestionSet> = {
  Communication: {
    title: "Effective Workplace Communication — Final Assessment",
    questions: [
      {
        id: "q1",
        text: "Before writing an important message, you should first:",
        options: ["Pick a font", "Clarify your intent and audience", "Add as much detail as possible", "Send it immediately"],
        correctIndex: 1,
        explanation: "Clarifying intent and audience shapes tone, length, and structure before a word is written.",
      },
      {
        id: "q2",
        text: "Active listening is best demonstrated by:",
        options: ["Interrupting to add your view", "Paraphrasing what you heard", "Staying silent throughout", "Taking no notes"],
        correctIndex: 1,
        explanation: "Paraphrasing confirms understanding and shows the speaker they were heard.",
      },
      {
        id: "q3",
        text: "A stakeholder briefing should generally:",
        options: ["Bury the conclusion at the end", "Lead with the key takeaway", "Avoid a clear ask", "Include every draft version"],
        correctIndex: 1,
        explanation: "Leading with the takeaway respects the audience's time and frames the rest of the briefing.",
      },
      {
        id: "q4",
        text: "In cross-team emails, ambiguity is most often reduced by:",
        options: ["Longer sentences", "Explicit owners and deadlines", "More exclamation marks", "Fewer line breaks"],
        correctIndex: 1,
        explanation: "Naming an owner and a deadline turns a vague request into an actionable one.",
      },
      {
        id: "q5",
        text: "The best response to a disagreement in a meeting is usually to:",
        options: ["Dismiss the other view", "Acknowledge it and seek common ground", "End the meeting", "Escalate immediately"],
        correctIndex: 1,
        explanation: "Acknowledging a differing view before responding keeps the discussion constructive.",
      },
    ],
  },
  "Digital Skills": {
    title: "Digital Tools for Government Teams — Final Assessment",
    questions: [
      {
        id: "q1",
        text: "A pivot table is most useful for:",
        options: ["Writing narrative reports", "Summarizing large datasets across dimensions", "Storing raw text", "Sending emails"],
        correctIndex: 1,
        explanation: "Pivot tables summarize and cross-tabulate data quickly along multiple dimensions.",
      },
      {
        id: "q2",
        text: "Version control on a shared document mainly helps you:",
        options: ["Delete old drafts", "Track and recover prior edits", "Skip review cycles", "Avoid comments"],
        correctIndex: 1,
        explanation: "Version history lets teams track changes and revert if needed.",
      },
      {
        id: "q3",
        text: "The safest way to share a sensitive file internally is to:",
        options: ["Email it as an attachment to a list", "Use an access-controlled shared drive", "Post it publicly", "Print and distribute"],
        correctIndex: 1,
        explanation: "Access-controlled storage limits exposure to only those who need the file.",
      },
      {
        id: "q4",
        text: "A spreadsheet formula returning #REF! usually means:",
        options: ["A missing decimal", "A reference to a deleted cell/range", "Too many colors", "A slow computer"],
        correctIndex: 1,
        explanation: "#REF! appears when a formula points to a cell or range that no longer exists.",
      },
      {
        id: "q5",
        text: "Two-factor authentication primarily protects against:",
        options: ["Slow internet", "Unauthorized account access", "Large file sizes", "Formatting errors"],
        correctIndex: 1,
        explanation: "A second verification factor blocks access even if a password is compromised.",
      },
    ],
  },
  "Problem Solving": {
    title: "Structured Problem Solving — Final Assessment",
    questions: [
      {
        id: "q1",
        text: "The 5-whys technique is designed to:",
        options: ["Assign blame quickly", "Trace a problem to its root cause", "Skip investigation", "Generate five solutions"],
        correctIndex: 1,
        explanation: "Repeatedly asking \"why\" traces a symptom back to its underlying cause.",
      },
      {
        id: "q2",
        text: "A decision matrix helps you:",
        options: ["Avoid making a decision", "Weigh options against consistent criteria", "Pick the first idea suggested", "Skip stakeholder input"],
        correctIndex: 1,
        explanation: "Scoring options against shared criteria makes trade-offs explicit and comparable.",
      },
      {
        id: "q3",
        text: "A fishbone diagram is used to:",
        options: ["Schedule a project", "Map potential causes of a problem by category", "Track budgets", "Design a logo"],
        correctIndex: 1,
        explanation: "Fishbone diagrams organize potential causes into categories to find the root cause.",
      },
      {
        id: "q4",
        text: "After selecting a solution, the next step is usually:",
        options: ["Forget about it", "Build a tracked implementation plan", "Announce it once", "Wait for someone else to act"],
        correctIndex: 1,
        explanation: "A tracked plan with owners and milestones turns a decision into results.",
      },
      {
        id: "q5",
        text: "Confusing correlation with causation risks:",
        options: ["No downside", "Solving the wrong root cause", "Faster results", "Better data quality"],
        correctIndex: 1,
        explanation: "Acting on a correlated-but-not-causal factor can leave the real root cause untouched.",
      },
    ],
  },
  Leadership: {
    title: "Foundations of Team Leadership — Final Assessment",
    questions: [
      {
        id: "q1",
        text: "Effective delegation means:",
        options: ["Assigning tasks without context", "Transferring ownership with clear expectations", "Doing it yourself instead", "Avoiding follow-up entirely"],
        correctIndex: 1,
        explanation: "Delegation works when ownership and expectations are clear from the start.",
      },
      {
        id: "q2",
        text: "Constructive feedback is most effective when it is:",
        options: ["Vague and delayed", "Specific and timely", "Public and harsh", "Only about what went wrong"],
        correctIndex: 1,
        explanation: "Specific, timely feedback is easier to act on than vague or delayed comments.",
      },
      {
        id: "q3",
        text: "During organizational change, leaders should primarily:",
        options: ["Withhold information to avoid panic", "Communicate clearly and often", "Delegate all communication", "Wait until change is finished"],
        correctIndex: 1,
        explanation: "Frequent, clear communication reduces uncertainty and builds trust during change.",
      },
      {
        id: "q4",
        text: "Micromanagement most often results from:",
        options: ["Too much delegation", "Low trust in the team's ability", "Excess feedback", "Clear accountability"],
        correctIndex: 1,
        explanation: "Micromanagement typically stems from a lack of trust rather than too much delegation.",
      },
      {
        id: "q5",
        text: "A leader accountable for a missed deadline should:",
        options: ["Blame the team publicly", "Own the outcome and adjust the plan", "Ignore it", "Reassign blame silently"],
        correctIndex: 1,
        explanation: "Owning outcomes while adjusting the plan models accountability for the team.",
      },
    ],
  },
}

function buildAnswerKey(courseId: string, trainerId: string, questions: AssessmentQuestionDraft[]): AssessmentAnswerKey {
  const answers: AssessmentAnswerKey["answers"] = {}
  for (const q of questions) answers[q.id] = { correctIndex: q.correctIndex, explanation: q.explanation }
  return { id: courseId, courseId, trainerId, answers }
}

function buildAttempt(params: {
  assessmentId: string
  courseId: string
  userId: string
  competency: string
  questions: AssessmentQuestionDraft[]
  competencyBefore: number
  competencyAfter: number
  submittedAt: number
  wrongCount: number
}): AssessmentAttempt {
  const { assessmentId, courseId, userId, competency, questions, competencyBefore, competencyAfter, submittedAt, wrongCount } = params
  const answers: number[] = []
  const review: AttemptReviewItem[] = []
  let correctCount = 0
  questions.forEach((q, i) => {
    const shouldBeWrong = i < wrongCount
    const chosenIndex = shouldBeWrong ? (q.correctIndex + 1) % q.options.length : q.correctIndex
    const correct = chosenIndex === q.correctIndex
    if (correct) correctCount += 1
    answers.push(chosenIndex)
    review.push({ questionId: q.id, chosenIndex, correctIndex: q.correctIndex, correct, explanation: q.explanation })
  })
  const score = Math.round((correctCount / questions.length) * 100)
  return {
    id: `${userId}_${assessmentId}`,
    assessmentId,
    courseId,
    userId,
    answers,
    review,
    passed: score >= 60,
    score,
    correctCount,
    totalQuestions: questions.length,
    competency,
    competencyBefore,
    competencyAfter,
    improvement: competencyAfter - competencyBefore,
    submittedAt,
  }
}

/** Server-side (Admin SDK) equivalent of lib/firebase/seed.ts. Safe to call multiple times. */
export async function seedDemoData(adminUid: string) {
  const db = adminDb()
  const existing = await db.collection("courses").count().get()
  if (existing.data().count > 0) {
    return { seeded: false, reason: "Demo data already exists." }
  }

  const now = Date.now()
  const batch = db.batch()

  function setCompetencies(userId: string, values: Record<string, { current: number; target: number }>) {
    const scores: CompetencyRecord["scores"] = {}
    for (const name of COMPETENCIES) {
      const v = values[name] ?? { current: 55, target: 75 }
      scores[name] = { current: v.current, target: v.target, updatedAt: now }
    }
    batch.set(db.collection("competencies").doc(userId), {
      userId,
      scores,
      updatedAt: now,
    } satisfies CompetencyRecord)
  }

  // Seed the admin's own competency baseline so dashboards render immediately.
  setCompetencies(adminUid, {
    "Data Analysis": { current: 42, target: 75 },
    Communication: { current: 76, target: 85 },
    "Digital Skills": { current: 68, target: 80 },
    "Problem Solving": { current: 81, target: 90 },
    Leadership: { current: 57, target: 75 },
  })

  // ---------------------------------------------------------------------
  // Trainers
  // ---------------------------------------------------------------------
  const trainers: Array<AppUser & { uid: string }> = [
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
      createdAt: now - 400 * DAY,
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
      createdAt: now - 380 * DAY,
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
      createdAt: now - 360 * DAY,
    },
    {
      uid: "demo-trainer-4",
      name: "Dr. Vikram Sethi",
      email: "vikram.sethi@capacityconnect.demo",
      role: "trainer",
      status: "approved",
      organization: "Administrative Staff College",
      designation: "Principal Consultant, Process Improvement",
      expertise: ["Problem Solving", "Data Analysis"],
      experienceYears: 15,
      qualifications: "Ph.D. Operations Research, IIM Ahmedabad",
      createdAt: now - 340 * DAY,
    },
    {
      uid: "demo-trainer-5",
      name: "Meera Iyer",
      email: "meera.iyer@capacityconnect.demo",
      role: "trainer",
      status: "approved",
      organization: "Institute for Leadership Development",
      designation: "Leadership & Team Development Coach",
      expertise: ["Leadership", "Communication"],
      experienceYears: 11,
      qualifications: "M.B.A., XLRI Jamshedpur",
      createdAt: now - 320 * DAY,
    },
  ]
  for (const t of trainers) batch.set(db.collection("users").doc(t.uid), t)

  // ---------------------------------------------------------------------
  // Trainees
  // ---------------------------------------------------------------------
  const traineeSeeds: Array<{
    uid: string
    name: string
    email: string
    organization: string
    designation: string
    interests: string[]
    skills: string[]
    competencies: Record<string, { current: number; target: number }>
  }> = [
    {
      uid: "demo-trainee-1",
      name: "Arjun Verma",
      email: "arjun.verma@capacityconnect.demo",
      organization: "Department of Revenue",
      designation: "Assistant Section Officer",
      interests: ["Data Analysis", "Problem Solving"],
      skills: ["Excel", "Report Writing"],
      competencies: {
        "Data Analysis": { current: 58, target: 80 },
        Communication: { current: 64, target: 75 },
        "Digital Skills": { current: 61, target: 75 },
        "Problem Solving": { current: 55, target: 78 },
        Leadership: { current: 40, target: 65 },
      },
    },
    {
      uid: "demo-trainee-2",
      name: "Fatima Sheikh",
      email: "fatima.sheikh@capacityconnect.demo",
      organization: "Department of Education",
      designation: "Program Associate",
      interests: ["Communication", "Leadership"],
      skills: ["Facilitation", "Stakeholder Management"],
      competencies: {
        "Data Analysis": { current: 45, target: 70 },
        Communication: { current: 72, target: 85 },
        "Digital Skills": { current: 58, target: 72 },
        "Problem Solving": { current: 60, target: 75 },
        Leadership: { current: 50, target: 72 },
      },
    },
    {
      uid: "demo-trainee-3",
      name: "Karan Malhotra",
      email: "karan.malhotra@capacityconnect.demo",
      organization: "Department of Health",
      designation: "Field Coordinator",
      interests: ["Digital Skills", "Data Analysis"],
      skills: ["Field Surveys", "Data Entry"],
      competencies: {
        "Data Analysis": { current: 50, target: 75 },
        Communication: { current: 55, target: 70 },
        "Digital Skills": { current: 62, target: 82 },
        "Problem Solving": { current: 48, target: 70 },
        Leadership: { current: 38, target: 60 },
      },
    },
    {
      uid: "demo-trainee-4",
      name: "Sneha Joshi",
      email: "sneha.joshi@capacityconnect.demo",
      organization: "Department of Urban Development",
      designation: "Planning Officer",
      interests: ["Problem Solving", "Leadership"],
      skills: ["Urban Planning", "GIS Basics"],
      competencies: {
        "Data Analysis": { current: 62, target: 80 },
        Communication: { current: 58, target: 75 },
        "Digital Skills": { current: 55, target: 72 },
        "Problem Solving": { current: 66, target: 85 },
        Leadership: { current: 52, target: 75 },
      },
    },
    {
      uid: "demo-trainee-5",
      name: "Rohan Gupta",
      email: "rohan.gupta@capacityconnect.demo",
      organization: "Department of Finance",
      designation: "Accounts Officer",
      interests: ["Data Analysis", "Digital Skills"],
      skills: ["Budgeting", "Financial Reporting"],
      competencies: {
        "Data Analysis": { current: 70, target: 85 },
        Communication: { current: 50, target: 68 },
        "Digital Skills": { current: 64, target: 80 },
        "Problem Solving": { current: 57, target: 75 },
        Leadership: { current: 45, target: 65 },
      },
    },
    {
      uid: "demo-trainee-6",
      name: "Divya Pillai",
      email: "divya.pillai@capacityconnect.demo",
      organization: "Department of Agriculture",
      designation: "Extension Officer",
      interests: ["Communication", "Digital Skills"],
      skills: ["Community Outreach", "Training Delivery"],
      competencies: {
        "Data Analysis": { current: 48, target: 70 },
        Communication: { current: 68, target: 82 },
        "Digital Skills": { current: 66, target: 80 },
        "Problem Solving": { current: 52, target: 72 },
        Leadership: { current: 55, target: 75 },
      },
    },
    {
      uid: "demo-trainee-7",
      name: "Aditya Kulkarni",
      email: "aditya.kulkarni@capacityconnect.demo",
      organization: "Department of Information Technology",
      designation: "Systems Analyst",
      interests: ["Digital Skills", "Problem Solving"],
      skills: ["SQL", "Systems Documentation"],
      competencies: {
        "Data Analysis": { current: 65, target: 82 },
        Communication: { current: 52, target: 70 },
        "Digital Skills": { current: 78, target: 90 },
        "Problem Solving": { current: 63, target: 80 },
        Leadership: { current: 42, target: 65 },
      },
    },
    {
      uid: "demo-trainee-8",
      name: "Neha Reddy",
      email: "neha.reddy@capacityconnect.demo",
      organization: "Department of Social Welfare",
      designation: "Case Officer",
      interests: ["Leadership", "Communication"],
      skills: ["Case Management", "Counseling"],
      competencies: {
        "Data Analysis": { current: 40, target: 65 },
        Communication: { current: 70, target: 85 },
        "Digital Skills": { current: 50, target: 70 },
        "Problem Solving": { current: 54, target: 72 },
        Leadership: { current: 60, target: 80 },
      },
    },
  ]

  for (const [i, t] of traineeSeeds.entries()) {
    const user: AppUser = {
      uid: t.uid,
      name: t.name,
      email: t.email,
      role: "trainee",
      status: "approved",
      organization: t.organization,
      designation: t.designation,
      interests: t.interests,
      skills: t.skills,
      createdAt: now - (300 - i * 10) * DAY,
    }
    batch.set(db.collection("users").doc(t.uid), user)
    setCompetencies(t.uid, t.competencies)
  }

  // ---------------------------------------------------------------------
  // Courses (one per trainer, one per competency)
  // ---------------------------------------------------------------------
  const courseDefs: Array<{
    trainerUid: string
    trainerName: string
    title: string
    description: string
    competency: string
    difficulty: Course["difficulty"]
    durationHours: number
    modules: Array<{ title: string; summary: string }>
  }> = [
    {
      trainerUid: "demo-trainer-1",
      trainerName: "Dr. Ananya Rao",
      title: "Data Analysis Fundamentals",
      description:
        "Build a practical foundation in reading, interpreting, and visualizing data so you can make evidence-based decisions at work.",
      competency: "Data Analysis",
      difficulty: "Beginner",
      durationHours: 6,
      modules: [
        { title: "Data Analysis Basics", summary: "Core statistical vocabulary, datasets, and how to frame a question." },
        { title: "Data Interpretation", summary: "Reading tables and summary statistics to draw sound conclusions." },
        { title: "Data Visualization", summary: "Choosing the right chart and avoiding misleading visuals." },
        { title: "Practical Application", summary: "Applying analysis techniques to a realistic workplace scenario." },
      ],
    },
    {
      trainerUid: "demo-trainer-2",
      trainerName: "Rakesh Menon",
      title: "Effective Workplace Communication",
      description: "Sharpen written and verbal communication for institutional and cross-team settings.",
      competency: "Communication",
      difficulty: "Beginner",
      durationHours: 4,
      modules: [
        { title: "Structuring a Clear Message", summary: "Framing intent before writing or speaking." },
        { title: "Active Listening", summary: "Techniques to confirm understanding in meetings." },
        { title: "Presenting to Stakeholders", summary: "Structuring a concise, persuasive briefing." },
      ],
    },
    {
      trainerUid: "demo-trainer-3",
      trainerName: "Priya Nair",
      title: "Digital Tools for Government Teams",
      description: "Practical fluency with spreadsheets, document collaboration, and secure digital workflows.",
      competency: "Digital Skills",
      difficulty: "Intermediate",
      durationHours: 5,
      modules: [
        { title: "Spreadsheet Fundamentals", summary: "Formulas, filters, and pivot basics." },
        { title: "Collaborative Documents", summary: "Version control and structured review cycles." },
        { title: "Digital Hygiene & Security", summary: "Safe data handling for institutional systems." },
      ],
    },
    {
      trainerUid: "demo-trainer-4",
      trainerName: "Dr. Vikram Sethi",
      title: "Structured Problem Solving",
      description: "A repeatable framework for diagnosing root causes and evaluating solution trade-offs.",
      competency: "Problem Solving",
      difficulty: "Intermediate",
      durationHours: 5,
      modules: [
        { title: "Root Cause Analysis", summary: "The 5-whys and fishbone techniques." },
        { title: "Option Evaluation", summary: "Weighing trade-offs with a decision matrix." },
        { title: "Implementation Planning", summary: "Turning a decision into a tracked action plan." },
      ],
    },
    {
      trainerUid: "demo-trainer-5",
      trainerName: "Meera Iyer",
      title: "Foundations of Team Leadership",
      description: "Core leadership habits for first-time team leads in institutional settings.",
      competency: "Leadership",
      difficulty: "Advanced",
      durationHours: 7,
      modules: [
        { title: "Delegation & Accountability", summary: "Assigning ownership without micromanaging." },
        { title: "Giving Feedback", summary: "Constructive, timely feedback conversations." },
        { title: "Leading Through Change", summary: "Communicating change with clarity and empathy." },
      ],
    },
  ]

  const courses: Course[] = courseDefs.map((c, i) => {
    const ref = db.collection("courses").doc()
    const course: Course = {
      id: ref.id,
      title: c.title,
      description: c.description,
      competency: c.competency,
      trainerId: c.trainerUid,
      trainerName: c.trainerName,
      difficulty: c.difficulty,
      durationHours: c.durationHours,
      modules: c.modules.map((m, j) => ({ id: `m${j + 1}`, title: m.title, order: j + 1, summary: m.summary })),
      enrollmentCount: 0,
      createdAt: now - (300 - i * 20) * DAY,
    }
    batch.set(ref, course)
    return course
  })

  // ---------------------------------------------------------------------
  // Assessments + answer keys (one per course)
  // ---------------------------------------------------------------------
  const dataAnalysisQuestions: AssessmentQuestionDraft[] = [
    {
      id: "q1",
      text: "Which measure best describes the 'typical' value in a dataset with extreme outliers?",
      options: ["Mean", "Median", "Range", "Standard deviation"],
      correctIndex: 1,
      explanation: "The median is resistant to outliers, unlike the mean which they skew.",
    },
    {
      id: "q2",
      text: "A dataset has a mean of 50 and a very high standard deviation. What does this tell you?",
      options: ["All values are close to 50", "Values are widely spread out from 50", "The dataset has no outliers", "The dataset is sorted"],
      correctIndex: 1,
      explanation: "High standard deviation indicates values are spread far from the mean.",
    },
    {
      id: "q3",
      text: "Which chart type is best for showing a trend over time?",
      options: ["Pie chart", "Line chart", "Scatter plot", "Bar chart"],
      correctIndex: 1,
      explanation: "Line charts clearly show continuous change across a time axis.",
    },
    {
      id: "q4",
      text: "What is the primary risk of a truncated (non-zero) y-axis on a bar chart?",
      options: ["It uses too much ink", "It exaggerates differences between bars", "It is harder to print", "It cannot show negative numbers"],
      correctIndex: 1,
      explanation: "Truncated axes visually exaggerate small differences, which can mislead readers.",
    },
    {
      id: "q5",
      text: "Correlation between two variables implies:",
      options: ["One causes the other", "They move together statistically, not necessarily causally", "They are unrelated", "The data is invalid"],
      correctIndex: 1,
      explanation: "Correlation does not imply causation; a third factor may explain the relationship.",
    },
    {
      id: "q6",
      text: "You want to summarize categorical survey responses. Which is most appropriate?",
      options: ["Scatter plot", "Frequency table / bar chart", "Line chart", "Histogram of raw text"],
      correctIndex: 1,
      explanation: "Frequency tables and bar charts summarize category counts clearly.",
    },
    {
      id: "q7",
      text: "What does a p-value below the significance threshold typically suggest?",
      options: ["The result is definitely true", "The observed effect is unlikely due to chance alone", "The sample size was too small", "The data is normally distributed"],
      correctIndex: 1,
      explanation: "A low p-value suggests the observed result is unlikely under the null hypothesis.",
    },
    {
      id: "q8",
      text: "Which is the best first step before analyzing a new dataset?",
      options: ["Build the final chart", "Check for missing values and data quality issues", "Delete all outliers", "Present it to leadership"],
      correctIndex: 1,
      explanation: "Data quality checks prevent flawed conclusions later in the analysis.",
    },
    {
      id: "q9",
      text: "A pivot table is most useful for:",
      options: ["Writing narrative reports", "Summarizing and cross-tabulating large datasets quickly", "Storing raw unstructured text", "Sending emails"],
      correctIndex: 1,
      explanation: "Pivot tables let you summarize and cross-tabulate data along multiple dimensions.",
    },
    {
      id: "q10",
      text: "When presenting data insights to non-technical stakeholders, you should:",
      options: ["Show every statistical test performed", "Lead with the key takeaway, then support it with clear visuals", "Use as much jargon as possible", "Omit the conclusion and let them decide"],
      correctIndex: 1,
      explanation: "Leading with the takeaway respects the audience's time and builds trust in the analysis.",
    },
  ]

  const assessmentByCourse = new Map<string, { assessment: Assessment; questions: AssessmentQuestionDraft[] }>()
  for (const course of courses) {
    const set = course.competency === "Data Analysis"
      ? { title: "Data Analysis Fundamentals — Final Assessment", questions: dataAnalysisQuestions }
      : QUESTION_SETS[course.competency]
    if (!set) continue
    const assessment: Assessment = {
      id: course.id,
      courseId: course.id,
      competency: course.competency,
      title: set.title,
      deadline: now + 21 * DAY,
      passMark: 60,
      trainerId: course.trainerId,
      questions: set.questions.map(({ id, text, options }) => ({ id, text, options })),
      createdAt: course.createdAt,
    }
    batch.set(db.collection("assessments").doc(course.id), assessment)
    batch.set(db.collection("assessmentKeys").doc(course.id), buildAnswerKey(course.id, course.trainerId, set.questions))
    assessmentByCourse.set(course.id, { assessment, questions: set.questions })
  }

  // ---------------------------------------------------------------------
  // Enrollments, attempts, certificates, evidence, feedback
  // ---------------------------------------------------------------------
  type PlanRow = { traineeIdx: number; courseIdx: number; progress: number; completed: boolean }
  const plan: PlanRow[] = [
    { traineeIdx: 0, courseIdx: 0, progress: 100, completed: true },
    { traineeIdx: 0, courseIdx: 1, progress: 40, completed: false },
    { traineeIdx: 1, courseIdx: 1, progress: 100, completed: true },
    { traineeIdx: 1, courseIdx: 2, progress: 65, completed: false },
    { traineeIdx: 2, courseIdx: 2, progress: 100, completed: true },
    { traineeIdx: 2, courseIdx: 3, progress: 20, completed: false },
    { traineeIdx: 3, courseIdx: 3, progress: 100, completed: true },
    { traineeIdx: 3, courseIdx: 4, progress: 50, completed: false },
    { traineeIdx: 4, courseIdx: 4, progress: 100, completed: true },
    { traineeIdx: 4, courseIdx: 0, progress: 30, completed: false },
    { traineeIdx: 5, courseIdx: 0, progress: 100, completed: true },
    { traineeIdx: 5, courseIdx: 2, progress: 100, completed: true },
    { traineeIdx: 6, courseIdx: 1, progress: 75, completed: false },
    { traineeIdx: 6, courseIdx: 3, progress: 100, completed: true },
    { traineeIdx: 7, courseIdx: 2, progress: 10, completed: false },
    { traineeIdx: 7, courseIdx: 4, progress: 100, completed: true },
  ]

  const evidenceStatuses: Evidence["status"][] = ["verified", "pending", "needs-revision"]
  let evidenceCounter = 0
  let feedbackCounter = 0
  let notificationCounter = 0
  let certificateCount = 0
  let attemptCount = 0

  function pushNotification(n: Omit<AppNotification, "id" | "createdAt"> & { createdAt?: number }) {
    notificationCounter += 1
    const ref = db.collection("notifications").doc()
    const notification: AppNotification = {
      id: ref.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      createdAt: n.createdAt ?? now - notificationCounter * 3600_000,
      ...(n.link ? { link: n.link } : {}),
    }
    batch.set(ref, notification)
  }

  for (const row of plan) {
    const trainee = traineeSeeds[row.traineeIdx]
    const course = courses[row.courseIdx]
    const totalModules = course.modules.length
    const completedModules = row.completed
      ? course.modules.map((m) => m.id)
      : course.modules.slice(0, Math.max(0, Math.round((row.progress / 100) * totalModules))).map((m) => m.id)
    const enrolledAt = now - (60 + row.courseIdx * 5) * DAY
    const enrollment: Enrollment = {
      id: `${trainee.uid}_${course.id}`,
      userId: trainee.uid,
      courseId: course.id,
      progress: row.progress,
      completedModules,
      status: row.completed ? "completed" : "in-progress",
      enrolledAt,
      ...(row.completed ? { completedAt: now - (10 + row.courseIdx) * DAY } : {}),
    }
    batch.set(db.collection("enrollments").doc(enrollment.id), enrollment)
    courses[row.courseIdx].enrollmentCount += 1

    pushNotification({
      userId: trainee.uid,
      type: "course",
      title: "Enrolled in a new course",
      message: `You enrolled in ${course.title}.`,
      read: true,
      createdAt: enrolledAt,
    })

    const assessmentInfo = assessmentByCourse.get(course.id)

    if (row.completed && assessmentInfo) {
      attemptCount += 1
      const wrongCount = attemptCount % 4 === 0 ? 3 : attemptCount % 3 === 0 ? 2 : attemptCount % 2 === 0 ? 1 : 0
      const competencyBefore = trainee.competencies[course.competency]?.current ?? 50
      const competencyAfter = Math.min(100, competencyBefore + 8)
      const attempt = buildAttempt({
        assessmentId: assessmentInfo.assessment.id,
        courseId: course.id,
        userId: trainee.uid,
        competency: course.competency,
        questions: assessmentInfo.questions,
        competencyBefore,
        competencyAfter,
        submittedAt: now - (9 + row.courseIdx) * DAY,
        wrongCount,
      })
      batch.set(db.collection("assessmentAttempts").doc(attempt.id), attempt)

      if (attempt.passed) {
        certificateCount += 1
        const certId = `${trainee.uid}_${course.id}`
        const certificate: Certificate = {
          id: certId,
          userId: trainee.uid,
          userName: trainee.name,
          courseId: course.id,
          courseTitle: course.title,
          trainerId: course.trainerId,
          competency: course.competency,
          score: attempt.score,
          certId: `CC-${course.id.slice(0, 5).toUpperCase()}-${trainee.uid.slice(-5).toUpperCase()}-${(now - certificateCount).toString().slice(-6)}`,
          issuedAt: now - (8 + row.courseIdx) * DAY,
        }
        batch.set(db.collection("certificates").doc(certId), certificate)

        pushNotification({
          userId: trainee.uid,
          type: "achievement",
          title: "Certificate issued",
          message: `You earned a certificate for completing ${course.title}.`,
          read: certificateCount % 2 === 0,
          link: "/trainee/certificates",
          createdAt: certificate.issuedAt,
        })
      }

      evidenceCounter += 1
      const evidenceRef = db.collection("evidence").doc()
      const evidence: Evidence = {
        id: evidenceRef.id,
        userId: trainee.uid,
        userName: trainee.name,
        courseId: course.id,
        courseTitle: course.title,
        competency: course.competency,
        trainerId: course.trainerId,
        title: `${course.title} — Workplace Application`,
        description: `Applied ${course.competency.toLowerCase()} techniques from ${course.title} to a real task at ${trainee.organization} and summarized the outcome for review.`,
        status: evidenceStatuses[evidenceCounter % evidenceStatuses.length],
        ...(evidenceStatuses[evidenceCounter % evidenceStatuses.length] !== "pending"
          ? {
              reviewNote:
                evidenceStatuses[evidenceCounter % evidenceStatuses.length] === "verified"
                  ? "Clear write-up with measurable outcome. Approved."
                  : "Please add more detail on the measured impact before resubmitting.",
              reviewedAt: now - (5 + row.courseIdx) * DAY,
            }
          : {}),
        createdAt: now - (7 + row.courseIdx) * DAY,
      }
      batch.set(evidenceRef, evidence)

      feedbackCounter += 1
      const feedbackRef = db.collection("feedback").doc()
      const feedback: Feedback = {
        id: feedbackRef.id,
        courseId: course.id,
        courseTitle: course.title,
        userId: trainee.uid,
        userName: trainee.name,
        rating: 4 + (feedbackCounter % 2),
        comment: `${course.title} was practical and directly applicable to my day-to-day work. The ${course.modules[0]?.title.toLowerCase()} module was especially useful.`,
        createdAt: now - (6 + row.courseIdx) * DAY,
      }
      batch.set(feedbackRef, feedback)
    } else if (assessmentInfo) {
      pushNotification({
        userId: trainee.uid,
        type: "deadline",
        title: "Assessment deadline approaching",
        message: `Complete ${course.title} before the assessment deadline to stay on track.`,
        read: false,
        link: `/trainee/courses/${course.id}`,
      })
    }
  }

  // Re-apply the final, correct enrollment counts computed above.
  for (const course of courses) {
    batch.set(db.collection("courses").doc(course.id), course)
  }

  // Welcome / approval notifications for every trainee.
  for (const trainee of traineeSeeds) {
    pushNotification({
      userId: trainee.uid,
      type: "approval",
      title: "Account approved",
      message: "Your Capacity Connect account has been approved. Explore courses matched to your competency gaps.",
      read: true,
      createdAt: now - 250 * DAY,
    })
  }

  // ---------------------------------------------------------------------
  // Announcements
  // ---------------------------------------------------------------------
  const announcements: Array<Omit<Announcement, "id" | "createdAt">> = [
    {
      title: "Capacity Connect is now live",
      message: "Explore your personalized learning path and close your priority skill gap this month.",
      audience: "all",
      kind: "announcement",
      showOnHomepage: true,
      createdBy: adminUid,
    },
    {
      title: "New cohort: Data Analysis Fundamentals",
      message: "A refreshed cohort begins this week. Enroll from My Learning to join.",
      audience: "trainee",
      kind: "announcement",
      showOnHomepage: false,
      createdBy: adminUid,
    },
    {
      title: "Trainer office hours this Friday",
      message: "Course trainers are holding open office hours for questions on active assessments.",
      audience: "trainer",
      kind: "announcement",
      showOnHomepage: false,
      createdBy: adminUid,
    },
  ]
  for (const a of announcements) {
    const ref = db.collection("announcements").doc()
    batch.set(ref, { ...a, id: ref.id, createdAt: now - 3 * DAY } satisfies Announcement)
  }

  await batch.commit()

  return { seeded: true }
}
