// Data model for the counsellor-facing assessment report.
// The entire "My Report" UI is driven by one object of this shape — swap
// the data in and every section (scores, quiz analysis, pitch script, etc.)
// updates automatically. Nothing in the UI layer should hard-code a
// student's name, score, or example — all of that lives here.

export type Severity = "high" | "medium" | "low";

export type ReportStudent = {
  name: string;
  contact?: string; // phone or email, if available
  cefrLevel: string; // A1..C2
  status: "complete" | "complete_partial" | "processing" | "insufficient_sample";
  assessmentDate: string; // ISO date
  overallScore: number;
};

export type ReportProfile = {
  age: string | null;
  occupation: string | null;
  motherTongue: string | null;
  speakingFrequency: string | null;
  selfRating: string | null;
  biggestChallenge: string | null;
  careerGoal: string | null;
};

export type ReportGoals = {
  goal: string | null;
  urgency: string | null;
  availability: string | null;
  preferredFormat: string | null;
  budget: string | null;
  preferredProgramme: string | null;
};

export type ScoreCard = {
  key: "overall" | "fluency" | "vocabulary" | "pronunciation" | "rhythm" | "grammar";
  label: string;
  score: number;
  interpretation?: string; // only shown when the app defines an interpretation rule for this band
};

export type QuizQuestion = {
  id: string;
  question: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  topic: string; // e.g. "Verb + Preposition", "Tense", "Articles"
  explanation: string;
  severity: Severity;
  recommendedPractice: string;
};

export type SpeechAnalysis = {
  wpm: number;
  fillerCount: number;
  longPauseCount: number;
  intelligibilityPct: number;
  npvi: number;
  rhythmScore: number;
};

export type PronunciationPattern = {
  word: string;
  whatWasSaid: string;
  expectedForm: string;
  possiblePattern: string;
  recommendedPractice: string;
};

export type GrammarIssue = {
  title: string;
  score: number;
  issue: string;
  evidence: string[]; // verbatim quotes from the transcript
  correctedExamples?: { wrong: string; right: string }[];
  recommendedPractice: string;
};

export type Strength = {
  title: string;
  evidence: string; // the concrete number/fact backing this up
};

export type GrowthArea = {
  title: string;
  score?: number;
  detail: string;
};

export type CourseRecommendation = {
  recommended: string;
  reasons: string[];
  alternate?: string;
};

export type CounsellorPitch = {
  opening: string;
  startWithStrengths: string;
  explainTheGap: string;
  showEvidence: string;
  connectGapToCourse: string;
  closing: string;
  script: string[]; // paragraphs, in order
  doSay: string[];
  avoidSaying: string[];
};

export type Objection = {
  studentSays: string;
  counsellorResponse: string;
};

export type CounsellorNotes = {
  discoveryQuestions: string[];
  whatToEmphasize: string[];
  whatNotToEmphasize: string[];
  recommendationReasoning: string[];
  followUpSuggestions: string[];
};

export type AssessmentReport = {
  student: ReportStudent;
  profile: ReportProfile;
  goals: ReportGoals;
  scores: ScoreCard[];
  executiveSummary: string;
  strengths: Strength[];
  growthAreas: GrowthArea[];
  quizScore: { correct: number; total: number } | null;
  quizQuestions: QuizQuestion[] | null; // null = per-question data unavailable
  speechAnalysis: SpeechAnalysis;
  pronunciationPatterns: PronunciationPattern[];
  grammarAnalysis: GrammarIssue[];
  courseRecommendation: CourseRecommendation;
  counsellorPitch: CounsellorPitch;
  objections: Objection[];
  counsellorNotes: CounsellorNotes;
};
