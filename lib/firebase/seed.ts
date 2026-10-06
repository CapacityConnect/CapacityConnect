import { collection, doc, getCountFromServer, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import type {
  Announcement,
  Assessment,
  AssessmentAnswerKey,
  AssessmentQuestionDraft,
  Course,
  CompetencyRecord,
  Feedback,
} from "@/lib/types"
import { COMPETENCIES } from "@/lib/types"

/** Seeds demo courses, competencies, assessments and announcements. Safe to call multiple times. */
export async function seedDemoData(adminUid: string) {
  const existing = await getCountFromServer(collection(db, "courses"))
  if (existing.data().count > 0) {
    return { seeded: false, reason: "Demo data already exists." }
  }

  // Seed the admin's own competency baseline so dashboards render immediately.
  const scores: CompetencyRecord["scores"] = {}
  const baseline: Record<string, { current: number; target: number }> = {
    "Data Analysis": { current: 42, target: 75 },
    Communication: { current: 76, target: 85 },
    "Digital Skills": { current: 68, target: 80 },
    "Problem Solving": { current: 81, target: 90 },
    Leadership: { current: 57, target: 75 },
  }
  for (const name of COMPETENCIES) {
    scores[name] = { current: baseline[name].current, target: baseline[name].target, updatedAt: Date.now() }
  }
  await setDoc(doc(db, "competencies", adminUid), { userId: adminUid, scores, updatedAt: Date.now() })

  const modules = [
    { title: "Data Analysis Basics", order: 1, summary: "Core statistical vocabulary, datasets, and how to frame a question." },
    { title: "Data Interpretation", order: 2, summary: "Reading tables and summary statistics to draw sound conclusions." },
    { title: "Data Visualization", order: 3, summary: "Choosing the right chart and avoiding misleading visuals." },
    { title: "Practical Application", order: 4, summary: "Applying analysis techniques to a realistic workplace scenario." },
  ].map((m, i) => ({ ...m, id: `m${i + 1}` }))

  const courseRef = doc(collection(db, "courses"))
  const course: Course = {
    id: courseRef.id,
    title: "Data Analysis Fundamentals",
    description:
      "Build a practical foundation in reading, interpreting, and visualizing data so you can make evidence-based decisions at work.",
    competency: "Data Analysis",
    trainerId: adminUid,
    trainerName: "Dr. Ananya Rao",
    difficulty: "Beginner",
    durationHours: 6,
    modules,
    enrollmentCount: 0,
    createdAt: Date.now(),
  }
  await setDoc(courseRef, course)

  const extraCourses: Array<Omit<Course, "id" | "enrollmentCount" | "createdAt">> = [
    {
      title: "Effective Workplace Communication",
      description: "Sharpen written and verbal communication for institutional and cross-team settings.",
      competency: "Communication",
      trainerId: adminUid,
      trainerName: "Rakesh Menon",
      difficulty: "Beginner",
      durationHours: 4,
      modules: [
        { id: "m1", title: "Structuring a Clear Message", order: 1, summary: "Framing intent before writing or speaking." },
        { id: "m2", title: "Active Listening", order: 2, summary: "Techniques to confirm understanding in meetings." },
        { id: "m3", title: "Presenting to Stakeholders", order: 3, summary: "Structuring a concise, persuasive briefing." },
      ],
    },
    {
      title: "Digital Tools for Government Teams",
      description: "Practical fluency with spreadsheets, document collaboration, and secure digital workflows.",
      competency: "Digital Skills",
      trainerId: adminUid,
      trainerName: "Priya Nair",
      difficulty: "Intermediate",
      durationHours: 5,
      modules: [
        { id: "m1", title: "Spreadsheet Fundamentals", order: 1, summary: "Formulas, filters, and pivot basics." },
        { id: "m2", title: "Collaborative Documents", order: 2, summary: "Version control and structured review cycles." },
        { id: "m3", title: "Digital Hygiene & Security", order: 3, summary: "Safe data handling for institutional systems." },
      ],
    },
    {
      title: "Structured Problem Solving",
      description: "A repeatable framework for diagnosing root causes and evaluating solution trade-offs.",
      competency: "Problem Solving",
      trainerId: adminUid,
      trainerName: "Dr. Ananya Rao",
      difficulty: "Intermediate",
      durationHours: 5,
      modules: [
        { id: "m1", title: "Root Cause Analysis", order: 1, summary: "The 5-whys and fishbone techniques." },
        { id: "m2", title: "Option Evaluation", order: 2, summary: "Weighing trade-offs with a decision matrix." },
        { id: "m3", title: "Implementation Planning", order: 3, summary: "Turning a decision into a tracked action plan." },
      ],
    },
    {
      title: "Foundations of Team Leadership",
      description: "Core leadership habits for first-time team leads in institutional settings.",
      competency: "Leadership",
      trainerId: adminUid,
      trainerName: "Rakesh Menon",
      difficulty: "Advanced",
      durationHours: 7,
      modules: [
        { id: "m1", title: "Delegation & Accountability", order: 1, summary: "Assigning ownership without micromanaging." },
        { id: "m2", title: "Giving Feedback", order: 2, summary: "Constructive, timely feedback conversations." },
        { id: "m3", title: "Leading Through Change", order: 3, summary: "Communicating change with clarity and empathy." },
      ],
    },
  ]

  for (const c of extraCourses) {
    const ref = doc(collection(db, "courses"))
    await setDoc(ref, { ...c, id: ref.id, enrollmentCount: 0, createdAt: Date.now() } satisfies Course)
  }

  const questions: AssessmentQuestionDraft[] = [
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
      options: [
        "All values are close to 50",
        "Values are widely spread out from 50",
        "The dataset has no outliers",
        "The dataset is sorted",
      ],
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
      options: [
        "It uses too much ink",
        "It exaggerates differences between bars",
        "It is harder to print",
        "It cannot show negative numbers",
      ],
      correctIndex: 1,
      explanation: "Truncated axes visually exaggerate small differences, which can mislead readers.",
    },
    {
      id: "q5",
      text: "Correlation between two variables implies:",
      options: [
        "One causes the other",
        "They move together statistically, not necessarily causally",
        "They are unrelated",
        "The data is invalid",
      ],
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
      options: [
        "The result is definitely true",
        "The observed effect is unlikely due to chance alone",
        "The sample size was too small",
        "The data is normally distributed",
      ],
      correctIndex: 1,
      explanation: "A low p-value suggests the observed result is unlikely under the null hypothesis.",
    },
    {
      id: "q8",
      text: "Which is the best first step before analyzing a new dataset?",
      options: [
        "Build the final chart",
        "Check for missing values and data quality issues",
        "Delete all outliers",
        "Present it to leadership",
      ],
      correctIndex: 1,
      explanation: "Data quality checks prevent flawed conclusions later in the analysis.",
    },
    {
      id: "q9",
      text: "A pivot table is most useful for:",
      options: [
        "Writing narrative reports",
        "Summarizing and cross-tabulating large datasets quickly",
        "Storing raw unstructured text",
        "Sending emails",
      ],
      correctIndex: 1,
      explanation: "Pivot tables let you summarize and cross-tabulate data along multiple dimensions.",
    },
    {
      id: "q10",
      text: "When presenting data insights to non-technical stakeholders, you should:",
      options: [
        "Show every statistical test performed",
        "Lead with the key takeaway, then support it with clear visuals",
        "Use as much jargon as possible",
        "Omit the conclusion and let them decide",
      ],
      correctIndex: 1,
      explanation: "Leading with the takeaway respects the audience's time and builds trust in the analysis.",
    },
  ]

  const assessmentAnswers: AssessmentAnswerKey["answers"] = {}
  for (const q of questions) {
    assessmentAnswers[q.id] = { correctIndex: q.correctIndex, explanation: q.explanation }
  }
  await setDoc(doc(collection(db, "assessments"), courseRef.id), {
    id: courseRef.id,
    courseId: courseRef.id,
    competency: "Data Analysis",
    title: "Data Analysis Fundamentals — Final Assessment",
    trainerId: adminUid,
    questions: questions.map(({ id, text, options }) => ({ id, text, options })),
    createdAt: Date.now(),
  } satisfies Assessment)
  await setDoc(doc(collection(db, "assessmentKeys"), courseRef.id), {
    id: courseRef.id,
    courseId: courseRef.id,
    trainerId: adminUid,
    answers: assessmentAnswers,
  } satisfies AssessmentAnswerKey)

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
  ]
  for (const a of announcements) {
    const ref = doc(collection(db, "announcements"))
    await setDoc(ref, { ...a, id: ref.id, createdAt: Date.now() } satisfies Announcement)
  }

  return { seeded: true }
}
