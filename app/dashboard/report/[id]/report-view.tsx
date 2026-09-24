"use client";

import { useState } from "react";
import type { AssessmentReport, Severity } from "@/lib/report-types";

const TABS = [
  "Overview",
  "Scores",
  "Quiz Analysis",
  "Speech Analysis",
  "Pronunciation",
  "Grammar",
  "Course Recommendation",
  "Counsellor Pitch",
  "Counsellor Notes"
] as const;
type Tab = (typeof TABS)[number];
const COUNSELLOR_ONLY: Tab[] = ["Counsellor Pitch", "Counsellor Notes"];

const card = "bg-white/5 rounded-xl border border-white/10 p-5";
const sectionTitle = "text-base font-semibold text-white mb-1";
const notProvided = (v: string | null | undefined) =>
  v ? <span className="text-white">{v}</span> : <span className="text-gray-500 italic">Not provided</span>;

function severityColor(s: Severity) {
  if (s === "high") return "bg-red-400/15 text-red-300 border-red-900/40";
  if (s === "medium") return "bg-orange-400/15 text-orange-300 border-orange-900/40";
  return "bg-yellow-400/15 text-yellow-300 border-yellow-900/40";
}

// Visible only when this is the active tab on screen. Printable tabs force
// visible under print regardless of which tab is active; counsellor-only
// tabs force hidden under print regardless — that content must never end up
// in a student-facing download.
function tabClass(tab: Tab, active: Tab) {
  const onScreen = tab === active ? "block" : "hidden";
  return COUNSELLOR_ONLY.includes(tab) ? `${onScreen} print:hidden` : `${onScreen} print:block`;
}

export default function ReportView({ report }: { report: AssessmentReport }) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [quizFilter, setQuizFilter] = useState<string>("All");

  return (
    <div>
      {/* TAB NAV — hidden entirely when printing */}
      <div className="flex flex-wrap gap-1 mb-5 border-b border-white/10 pb-2 print:hidden">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-xs font-semibold px-3 py-2 rounded-lg ${
              tab === t ? "bg-brand-gradient text-white" : "text-gray-400 hover:bg-white/5"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      <div className={tabClass("Overview", tab) + " space-y-5 print:mb-6"}>
        <div className={card}>
          <p className={sectionTitle}>Overall AI report</p>
          <p className="text-sm text-gray-300 leading-relaxed">{report.executiveSummary}</p>
        </div>

        <div className="grid grid-cols-2 gap-5 print:grid-cols-2">
          <div className={card}>
            <p className={sectionTitle}>Strengths</p>
            {report.strengths.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No strengths identified yet.</p>
            ) : (
              <ul className="space-y-2">
                {report.strengths.map((s, i) => (
                  <li key={i} className="text-sm">
                    <span className="text-green-300 font-medium">✓ {s.title}</span>
                    {s.evidence && <span className="text-gray-500 block text-xs mt-0.5">{s.evidence}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={card}>
            <p className={sectionTitle}>Growth areas</p>
            {report.growthAreas.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No growth areas identified yet.</p>
            ) : (
              <ul className="space-y-3">
                {report.growthAreas.map((g, i) => (
                  <li key={i} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-orange-300 font-medium">{g.title}</span>
                      {g.score !== undefined && <span className="text-xs text-gray-400">Score: {g.score}</span>}
                    </div>
                    {g.detail && <p className="text-gray-400 text-xs mt-1">{g.detail}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className={card}>
          <p className={sectionTitle}>Student profile</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-1">Age</p>
              {notProvided(report.profile.age)}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Occupation</p>
              {notProvided(report.profile.occupation)}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Mother tongue</p>
              {notProvided(report.profile.motherTongue)}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Speaking frequency</p>
              {notProvided(report.profile.speakingFrequency)}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Self-rating</p>
              {notProvided(report.profile.selfRating)}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Biggest challenge</p>
              {notProvided(report.profile.biggestChallenge)}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Career goal</p>
              {notProvided(report.profile.careerGoal)}
            </div>
          </div>
        </div>

        <div className={card}>
          <p className={sectionTitle}>Goals & budget</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-1">Goal</p>
              {notProvided(report.goals.goal)}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Urgency</p>
              {notProvided(report.goals.urgency)}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Availability</p>
              {notProvided(report.goals.availability)}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Preferred format</p>
              {notProvided(report.goals.preferredFormat)}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Budget</p>
              {notProvided(report.goals.budget)}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Preferred programme</p>
              {notProvided(report.goals.preferredProgramme)}
            </div>
          </div>
        </div>
      </div>

      {/* SCORES */}
      <div className={tabClass("Scores", tab) + " grid grid-cols-3 gap-4 print:mb-6"}>
        {report.scores.map((s) => (
          <div key={s.key} className="relative bg-black/40 rounded-xl p-5 border border-white/10 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-brand-gradient" />
            <p className="text-xs text-gray-400 uppercase tracking-wide">{s.label}</p>
            <p className="text-3xl font-heading font-bold mt-2 text-white">{s.score}</p>
            <div className="h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-brand-gradient" style={{ width: `${s.score}%` }} />
            </div>
            {s.interpretation && <p className="text-xs text-gray-400 mt-2">{s.interpretation}</p>}
          </div>
        ))}
      </div>

      {/* QUIZ ANALYSIS */}
      <div className={tabClass("Quiz Analysis", tab) + " space-y-5 print:mb-6"}>
        <div className={card}>
          <p className={sectionTitle}>Quiz score</p>
          <p className="text-3xl font-bold text-white">
            {report.quizScore ? `${report.quizScore.correct}/${report.quizScore.total}` : "—"}
          </p>
        </div>

        {!report.quizQuestions || report.quizQuestions.length === 0 ? (
          <div className={card}>
            <p className="text-sm text-gray-400 italic">Detailed question analysis is unavailable for this assessment.</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {report.quizQuestions
                .filter((q) => !q.isCorrect)
                .map((q, i) => (
                  <div key={q.id} className={card}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Question {String(i + 1).padStart(2, "0")}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${severityColor(q.severity)}`}>
                        {q.severity} severity
                      </span>
                    </div>
                    <p className="text-sm text-white mb-3">{q.question}</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-red-400/10 border border-red-900/40 rounded-lg p-3">
                        <p className="text-xs text-red-300 font-semibold mb-1">✕ Student Answer</p>
                        <p className="text-sm text-gray-200">"{q.studentAnswer}"</p>
                      </div>
                      <div className="bg-green-400/10 border border-green-900/40 rounded-lg p-3">
                        <p className="text-xs text-green-300 font-semibold mb-1">✓ Correct Answer</p>
                        <p className="text-sm text-gray-200">"{q.correctAnswer}"</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mb-1">
                      <span className="text-gray-300 font-medium">Why it's wrong: </span>
                      {q.explanation}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
                      <span>
                        <span className="text-gray-300 font-medium">Topic: </span>
                        {q.topic}
                      </span>
                      <span>
                        <span className="text-gray-300 font-medium">Practice: </span>
                        {q.recommendedPractice}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
            <QuizSummaryTable questions={report.quizQuestions} filter={quizFilter} setFilter={setQuizFilter} />
          </>
        )}
      </div>

      {/* SPEECH ANALYSIS */}
      <div className={tabClass("Speech Analysis", tab) + " space-y-5 print:mb-6"}>
        <div className={card}>
          <p className={sectionTitle}>How they sound</p>
          <div className="grid grid-cols-3 gap-4">
            <MetricTile
              label="Speaking pace"
              value={`${report.speechAnalysis.wpm} WPM`}
              note={report.speechAnalysis.wpm >= 90 && report.speechAnalysis.wpm <= 160 ? "Comfortable, natural pace" : undefined}
            />
            <MetricTile
              label="Filler words"
              value={String(report.speechAnalysis.fillerCount)}
              note={report.speechAnalysis.fillerCount === 0 ? "None detected — very composed delivery" : undefined}
            />
            <MetricTile label="Long pauses" value={String(report.speechAnalysis.longPauseCount)} />
            <MetricTile
              label="Intelligibility"
              value={`${report.speechAnalysis.intelligibilityPct}%`}
              note={report.speechAnalysis.intelligibilityPct >= 85 ? "Excellent clarity" : undefined}
            />
            <MetricTile label="Rhythm score" value={String(report.speechAnalysis.rhythmScore)} />
          </div>
          <details className="mt-4 print:hidden">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">Technical details</summary>
            <div className="mt-2 text-xs text-gray-500 space-y-1">
              <p>nPVI (rhythm variability index): {report.speechAnalysis.npvi}</p>
            </div>
          </details>
        </div>
      </div>

      {/* PRONUNCIATION */}
      <div className={tabClass("Pronunciation", tab) + " print:mb-6"}>
        <div className={card}>
          <p className={sectionTitle}>Pronunciation patterns to investigate</p>
          <p className="text-xs text-gray-400 mb-4">
            These are patterns worth exploring further with the student — not a clinical diagnosis.
          </p>
          {report.pronunciationPatterns.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No pronunciation patterns flagged for this assessment.</p>
          ) : (
            <div className="space-y-3">
              {report.pronunciationPatterns.map((p, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-4">
                  {p.word ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-white">{p.word}</span>
                        <span className="text-xs text-gray-500">→</span>
                        <span className="text-sm text-orange-300">"{p.whatWasSaid}"</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-xs text-gray-400">
                        <div>
                          <p className="text-gray-500 mb-0.5">Expected form</p>
                          {p.expectedForm}
                        </div>
                        <div>
                          <p className="text-gray-500 mb-0.5">Possible pattern</p>
                          {p.possiblePattern}
                        </div>
                        <div>
                          <p className="text-gray-500 mb-0.5">Recommended practice</p>
                          {p.recommendedPractice}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-300">{p.note}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* GRAMMAR */}
      <div className={tabClass("Grammar", tab) + " space-y-4 print:mb-6"}>
        {report.grammarAnalysis.length === 0 ? (
          <div className={card}>
            <p className="text-sm text-gray-500 italic">No grammar analysis available for this assessment.</p>
          </div>
        ) : (
          report.grammarAnalysis.map((g, i) => (
            <div key={i} className={card}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-white">{g.title}</p>
                {g.score !== undefined && <span className="text-xs text-gray-400">Score: {g.score}</span>}
              </div>
              <p className="text-sm text-gray-300 mb-3">{g.issue}</p>
              {g.evidence && g.evidence.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-400 mb-1.5">Evidence from spontaneous speech</p>
                  <div className="flex flex-wrap gap-2">
                    {g.evidence.map((e, j) => (
                      <span key={j} className="text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-gray-300 font-mono">
                        "{e}"
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {g.correctedExamples && (
                <div className="mb-3 space-y-1.5">
                  {g.correctedExamples.map((c, j) => (
                    <div key={j} className="flex items-center gap-2 text-xs">
                      <span className="text-red-300">✕ {c.wrong}</span>
                      <span className="text-gray-500">→</span>
                      <span className="text-green-300">✓ {c.right}</span>
                    </div>
                  ))}
                </div>
              )}
              {g.recommendedPractice && (
                <p className="text-xs text-gray-400">
                  <span className="text-gray-300 font-medium">Recommended practice: </span>
                  {g.recommendedPractice}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* COURSE RECOMMENDATION */}
      <div className={tabClass("Course Recommendation", tab) + " print:mb-6"}>
        <div className={card}>
          <p className="text-xs text-brand-gold font-semibold uppercase tracking-wide mb-1">Recommended</p>
          <p className="text-2xl font-bold text-white mb-4">{report.courseRecommendation.recommended}</p>
          {report.courseRecommendation.reasons.length > 0 && (
            <>
              <p className="text-xs text-gray-400 mb-2">Why:</p>
              <ul className="space-y-1.5 mb-4">
                {report.courseRecommendation.reasons.map((r, i) => (
                  <li key={i} className="text-sm text-gray-300 flex gap-2">
                    <span className="text-brand-gold">•</span> {r}
                  </li>
                ))}
              </ul>
            </>
          )}
          {report.courseRecommendation.alternate && (
            <p className="text-xs text-gray-400 pt-3 border-t border-white/10">
              Alternative: <span className="text-white">{report.courseRecommendation.alternate}</span>
            </p>
          )}
        </div>
      </div>

      {/* COUNSELLOR PITCH — never printed */}
      <div className={tabClass("Counsellor Pitch", tab) + " space-y-5"}>
        <div className="rounded-xl border border-yellow-900/40 bg-yellow-400/5 p-3 text-xs text-yellow-200">
          Internal use only — this section is never shown to the student and is excluded from downloads.
        </div>
        {report.counsellorPitch.script.length === 0 ? (
          <div className={card}>
            <p className="text-sm text-gray-500 italic">
              No pitch script generated for this assessment yet. See Counsellor Notes for the raw counsellor notes field.
            </p>
          </div>
        ) : (
          <div className={card}>
            <p className={sectionTitle}>Pitch notes</p>
            <div className="space-y-3">
              {report.counsellorPitch.script.map((p, i) => (
                <p key={i} className="text-sm text-gray-300 leading-relaxed italic">
                  "{p}"
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* COUNSELLOR NOTES — never printed */}
      <div className={tabClass("Counsellor Notes", tab) + " space-y-5"}>
        <div className="rounded-xl border border-yellow-900/40 bg-yellow-400/5 p-3 text-xs text-yellow-200">
          Internal use only — excluded from downloads.
        </div>
        {report.counsellorNotes.recommendationReasoning.length === 0 ? (
          <div className={card}>
            <p className="text-sm text-gray-500 italic">No counsellor notes recorded for this assessment.</p>
          </div>
        ) : (
          <div className={card}>
            <p className={sectionTitle}>Notes</p>
            <ul className="space-y-2">
              {report.counsellorNotes.recommendationReasoning.map((s, i) => (
                <li key={i} className="text-sm text-gray-300">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
      {note && <p className="text-xs text-green-300 mt-1">{note}</p>}
    </div>
  );
}

function QuizSummaryTable({
  questions,
  filter,
  setFilter
}: {
  questions: AssessmentReport["quizQuestions"];
  filter: string;
  setFilter: (f: string) => void;
}) {
  if (!questions) return null;
  const topics = Array.from(new Set(questions.map((q) => q.topic)));
  const filterOptions = ["All", "Wrong", "Correct", ...topics];
  const filtered = questions.filter((q) => {
    if (filter === "All") return true;
    if (filter === "Wrong") return !q.isCorrect;
    if (filter === "Correct") return q.isCorrect;
    return q.topic === filter;
  });

  return (
    <div className={card}>
      <p className={sectionTitle}>Question-wise performance</p>
      <div className="flex flex-wrap gap-1.5 mb-4 print:hidden">
        {filterOptions.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-2.5 py-1 rounded-full border ${
              filter === f ? "bg-brand-gradient text-white border-transparent" : "border-white/15 text-gray-400 hover:bg-white/5"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <table className="w-full text-sm">
        <thead className="text-gray-400 text-xs uppercase">
          <tr>
            <th className="text-left py-2">Question</th>
            <th className="text-left py-2">Topic</th>
            <th className="text-left py-2">Student answer</th>
            <th className="text-left py-2">Correct answer</th>
            <th className="text-left py-2">Result</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((q, i) => (
            <tr key={q.id} className="border-t border-white/5">
              <td className="py-2 text-gray-300">Q{i + 1}</td>
              <td className="py-2 text-gray-400">{q.topic}</td>
              <td className="py-2 text-gray-300">{q.studentAnswer}</td>
              <td className="py-2 text-gray-300">{q.correctAnswer}</td>
              <td className="py-2">
                <span className={q.isCorrect ? "text-green-300" : "text-red-300"}>{q.isCorrect ? "Correct" : "Wrong"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
