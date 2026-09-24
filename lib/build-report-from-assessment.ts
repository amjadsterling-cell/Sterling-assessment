import { overallScoreToCEFR } from "./scoring";
import type { AssessmentReport } from "./report-types";

/**
 * Builds the report UI's data shape from what actually exists in the
 * database today. Deliberately conservative: fields the current schema or
 * Gemini prompt doesn't provide come through as null/empty so the UI shows
 * an honest "not provided" / "unavailable" state rather than inventing
 * structure that isn't backed by real data.
 */
export function buildReportFromAssessment(a: any): AssessmentReport {
  const report = a.report_json as any;

  // Fixes a real bug in the previous version of this page: it always fell
  // back to a stale/undefined value instead of the LLM's actual CEFR level.
  const cefrLevel = report?.cefr_level ?? (a.overall_score != null ? overallScoreToCEFR(a.overall_score) : "—");

  const metrics = a.metrics ?? {};
  // Supports both the single-recording metrics shape and the two-recording
  // shape (metrics.speaking1 / metrics.speaking2) — whichever this row has.
  const speakingMetrics = metrics.speaking1
    ? {
        wpm: Math.round(((metrics.speaking1.wpm ?? 0) + (metrics.speaking2?.wpm ?? metrics.speaking1.wpm ?? 0)) / (metrics.speaking2 ? 2 : 1)),
        fillerCount: undefined, // fillerRate is stored, not a raw count — leave uncomputed rather than guess
        longPauseCount: (metrics.speaking1.longPauseCount ?? 0) + (metrics.speaking2?.longPauseCount ?? 0)
      }
    : { wpm: metrics.wpm ?? 0, fillerCount: undefined, longPauseCount: metrics.longPauseCount ?? 0 };

  return {
    student: {
      name: a.leads?.name ?? "Unknown",
      contact: a.leads?.phone ?? a.leads?.email ?? undefined,
      cefrLevel,
      status: a.status,
      assessmentDate: a.completed_at ?? a.created_at,
      overallScore: a.overall_score ?? 0
    },

    // None of these profile fields exist as distinct DB columns beyond what's
    // listed — "career goal" specifically isn't captured separately from the
    // goals-and-budget "goal" field, so it's left not-provided here rather
    // than duplicating that field under a different label.
    profile: {
      age: a.age_range ?? null,
      occupation: a.occupation ?? null,
      motherTongue: a.mother_tongue ?? null,
      speakingFrequency: a.years_english_use ?? null,
      selfRating: a.self_rated_fluency != null ? `${a.self_rated_fluency}/10` : null,
      biggestChallenge: a.biggest_struggle ?? null,
      careerGoal: null
    },

    goals: {
      goal: a.goal ?? null,
      urgency: a.urgency ?? null,
      availability: a.availability ?? null,
      preferredFormat: a.class_format ?? null,
      budget: a.budget_range ?? null,
      preferredProgramme: null // distinct from the recommended course below — not separately captured today
    },

    scores: [
      { key: "overall", label: "Overall", score: a.overall_score ?? 0 },
      { key: "fluency", label: "Fluency", score: a.fluency_score ?? 0 },
      { key: "vocabulary", label: "Vocabulary", score: a.vocabulary_score ?? 0 },
      // The DB's "intelligibility_score" is what the spec calls Pronunciation.
      { key: "pronunciation", label: "Pronunciation", score: a.intelligibility_score ?? 0 },
      { key: "rhythm", label: "Rhythm & Flow", score: a.rhythm_score ?? 0 },
      { key: "grammar", label: "Grammar", score: a.grammar_score ?? 0 }
    ],

    executiveSummary: report?.headline ?? "Report not yet generated for this assessment.",

    strengths: (report?.strengths ?? []).map((s: string) => ({ title: s })),

    growthAreas: (report?.growth_areas ?? []).map((g: string) => ({ title: g })),

    // Per-question quiz tracking isn't stored yet — only the aggregate
    // percentage is. quizQuestions stays null so the UI shows the honest
    // "detailed question analysis unavailable" state rather than a fake list.
    quizScore: a.quiz_score != null ? { correct: a.quiz_score, total: 100 } : null,
    quizQuestions: null,

    speechAnalysis: {
      wpm: speakingMetrics.wpm,
      fillerCount: speakingMetrics.fillerCount ?? 0,
      longPauseCount: speakingMetrics.longPauseCount,
      intelligibilityPct: a.intelligibility_score ?? 0,
      npvi: metrics.npvi ?? 0,
      rhythmScore: a.rhythm_score ?? 0
    },

    // Current Gemini output is a flat string[] of prose descriptions, not
    // structured word/expected-form pairs — carried through as notes.
    pronunciationPatterns: (report?.pronunciation_patterns ?? []).map((note: string) => ({ note })),

    // Current Gemini output is a single prose string, not a structured list
    // with per-issue evidence — wrapped as one freeform card.
    grammarAnalysis: report?.grammar_notes
      ? [{ title: "Grammar notes", score: a.grammar_score ?? undefined, issue: report.grammar_notes }]
      : [],

    courseRecommendation: {
      recommended: a.recommended_course ?? "—",
      alternate: a.alternate_course ?? undefined,
      reasons: report?.why_this_course ? [report.why_this_course] : []
    },

    // Not generated by the current Gemini prompt — left empty rather than
    // fabricating a script. counsellor_notes (private, freeform) is the
    // closest existing field and is surfaced under Counsellor Notes instead.
    counsellorPitch: {
      opening: "",
      startWithStrengths: "",
      explainTheGap: "",
      showEvidence: "",
      connectGapToCourse: "",
      closing: "",
      script: report?.pitch_notes_ml ? [report.pitch_notes_ml] : [],
      doSay: [],
      avoidSaying: []
    },

    objections: [],

    counsellorNotes: {
      discoveryQuestions: [],
      whatToEmphasize: [],
      whatNotToEmphasize: [],
      recommendationReasoning: report?.counsellor_notes ? [report.counsellor_notes] : [],
      followUpSuggestions: []
    }
  };
}
