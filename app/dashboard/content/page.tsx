"use client";

import { useEffect, useState } from "react";
import type {
  AssessmentContent,
  QuizQuestion,
  QuizOption,
  Passage,
  Course
} from "@/lib/content-types";

function uid() {
  return Math.random().toString(36).slice(2, 8);
}

const emptyContent: AssessmentContent = {
  profileQuestions: [],
  quiz: [],
  passages: [],
  speakingPrompts: [],
  goalsQuestions: [],
  courses: []
};

function SectionCard({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border rounded-xl p-5 space-y-4">
      <div>
        <h2 className="font-bold text-base">{title}</h2>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function IconButton({
  onClick,
  label,
  danger
}: {
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
        danger ? "border-red-200 text-red-600 hover:bg-red-50" : "border-gray-300 text-gray-700 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

export default function ContentEditorPage() {
  const [content, setContent] = useState<AssessmentContent>(emptyContent);
  const [version, setVersion] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    fetch("/api/content")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setStatus(data.error);
        } else {
          setContent({ ...emptyContent, ...data.content });
          setVersion(data.version);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setStatus(null);
    setSaving(true);
    const res = await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setStatus(data.error ?? "Save failed");
    } else {
      setVersion(data.version);
      setStatus(`Saved as version ${data.version}. Existing reports stay tied to their original version.`);
    }
  }

  // ---- Quiz questions ----
  function addQuizQuestion() {
    const q: QuizQuestion = {
      id: `q_${uid()}`,
      prompt: "",
      tests: "",
      correct: "a",
      advanced: false,
      options: [
        { key: "a", text: "" },
        { key: "b", text: "" },
        { key: "c", text: "" },
        { key: "d", text: "" }
      ]
    };
    setContent((c) => ({ ...c, quiz: [...c.quiz, q] }));
  }
  function updateQuiz(i: number, patch: Partial<QuizQuestion>) {
    setContent((c) => ({ ...c, quiz: c.quiz.map((q, idx) => (idx === i ? { ...q, ...patch } : q)) }));
  }
  function updateQuizOption(qi: number, oi: number, text: string) {
    setContent((c) => ({
      ...c,
      quiz: c.quiz.map((q, idx) =>
        idx === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? { ...o, text } : o)) } : q
      )
    }));
  }
  function removeQuiz(i: number) {
    setContent((c) => ({ ...c, quiz: c.quiz.filter((_, idx) => idx !== i) }));
  }

  // ---- Passages ----
  function addPassage() {
    const p: Passage = { id: `p_${uid()}`, text: "", targetWords: [] };
    setContent((c) => ({ ...c, passages: [...c.passages, p] }));
  }
  function updatePassage(i: number, patch: Partial<Passage>) {
    setContent((c) => ({ ...c, passages: c.passages.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) }));
  }
  function updatePassageWords(i: number, wordsCsv: string) {
    const words = wordsCsv
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean)
      .map((word) => ({ word }));
    updatePassage(i, { targetWords: words });
  }
  function removePassage(i: number) {
    setContent((c) => ({ ...c, passages: c.passages.filter((_, idx) => idx !== i) }));
  }

  // ---- Speaking prompts ----
  function addSpeakingPrompt() {
    setContent((c) => ({ ...c, speakingPrompts: [...c.speakingPrompts, ""] }));
  }
  function updateSpeakingPrompt(i: number, value: string) {
    setContent((c) => ({ ...c, speakingPrompts: c.speakingPrompts.map((p, idx) => (idx === i ? value : p)) }));
  }
  function removeSpeakingPrompt(i: number) {
    setContent((c) => ({ ...c, speakingPrompts: c.speakingPrompts.filter((_, idx) => idx !== i) }));
  }

  // ---- Courses ----
  function addCourse() {
    const course: Course = { name: "", sessions: 1, fee: 0 };
    setContent((c) => ({ ...c, courses: [...c.courses, course] }));
  }
  function updateCourse(i: number, patch: Partial<Course>) {
    setContent((c) => ({ ...c, courses: c.courses.map((co, idx) => (idx === i ? { ...co, ...patch } : co)) }));
  }
  function removeCourse(i: number) {
    setContent((c) => ({ ...c, courses: c.courses.filter((_, idx) => idx !== i) }));
  }

  const inputClass = "w-full border rounded-lg px-3 py-2 text-sm";

  return (
    <div className="max-w-3xl pb-16">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold">Edit questions</h1>
        {version && <span className="text-xs text-gray-500">Active version: {version}</span>}
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Add or edit what candidates see. Saving creates a new version — assessments already taken
        keep pointing at their original version, so old reports never change retroactively.
      </p>

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-6">
          <SectionCard title="Quiz questions" description="Multiple-choice grammar/vocab questions.">
            {content.quiz.map((q, qi) => (
              <div key={q.id} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-500 pt-2">Question {qi + 1}</span>
                  <IconButton danger label="Remove" onClick={() => removeQuiz(qi)} />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Question text</label>
                  <input
                    className={inputClass}
                    value={q.prompt}
                    onChange={(e) => updateQuiz(qi, { prompt: e.target.value })}
                    placeholder="Choose the correct sentence."
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">What this tests (internal label)</label>
                  <input
                    className={inputClass}
                    value={q.tests}
                    onChange={(e) => updateQuiz(qi, { tests: e.target.value })}
                    placeholder="verb+preposition"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((o: QuizOption, oi: number) => (
                    <div key={o.key} className="flex items-center gap-2">
                      <span className="text-xs font-mono w-5 text-gray-500 uppercase">{o.key}</span>
                      <input
                        className={inputClass}
                        value={o.text}
                        onChange={(e) => updateQuizOption(qi, oi, e.target.value)}
                        placeholder={`Option ${o.key.toUpperCase()}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600">Correct answer</label>
                    <select
                      className="border rounded-lg px-2 py-1.5 text-sm"
                      value={q.correct}
                      onChange={(e) => updateQuiz(qi, { correct: e.target.value })}
                    >
                      {q.options.map((o: QuizOption) => (
                        <option key={o.key} value={o.key}>
                          {o.key.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={q.advanced}
                      onChange={(e) => updateQuiz(qi, { advanced: e.target.checked })}
                    />
                    Advanced question
                  </label>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addQuizQuestion}
              className="w-full border-2 border-dashed rounded-lg py-2.5 text-sm font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700"
            >
              + Add quiz question
            </button>
          </SectionCard>

          <SectionCard title="Reading passages" description="Text candidates read aloud, plus the key words to check pronunciation on.">
            {content.passages.map((p, pi) => (
              <div key={p.id} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-500 pt-2">Passage {pi + 1}</span>
                  <IconButton danger label="Remove" onClick={() => removePassage(pi)} />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Passage text</label>
                  <textarea
                    className={`${inputClass} h-24`}
                    value={p.text}
                    onChange={(e) => updatePassage(pi, { text: e.target.value })}
                    placeholder="Last Thursday, my colleague and I had to develop a new schedule..."
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Target words (comma-separated)</label>
                  <input
                    className={inputClass}
                    value={p.targetWords.map((w) => w.word).join(", ")}
                    onChange={(e) => updatePassageWords(pi, e.target.value)}
                    placeholder="thursday, develop, schedule, department, eventually"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addPassage}
              className="w-full border-2 border-dashed rounded-lg py-2.5 text-sm font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700"
            >
              + Add passage
            </button>
          </SectionCard>

          <SectionCard title="Open speaking prompts" description="Topics candidates speak freely about.">
            {content.speakingPrompts.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className={inputClass}
                  value={p}
                  onChange={(e) => updateSpeakingPrompt(i, e.target.value)}
                  placeholder="Tell me about your typical working day."
                />
                <IconButton danger label="Remove" onClick={() => removeSpeakingPrompt(i)} />
              </div>
            ))}
            <button
              type="button"
              onClick={addSpeakingPrompt}
              className="w-full border-2 border-dashed rounded-lg py-2.5 text-sm font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700"
            >
              + Add speaking prompt
            </button>
          </SectionCard>

          <SectionCard title="Courses" description="Shown to the candidate as recommended course options.">
            {content.courses.map((co, i) => (
              <div key={i} className="flex items-center gap-2 flex-wrap">
                <input
                  className={`${inputClass} flex-1 min-w-[140px]`}
                  value={co.name}
                  onChange={(e) => updateCourse(i, { name: e.target.value })}
                  placeholder="Course name"
                />
                <input
                  type="number"
                  className={`${inputClass} w-28`}
                  value={co.sessions}
                  onChange={(e) => updateCourse(i, { sessions: Number(e.target.value) })}
                  placeholder="Sessions"
                />
                <input
                  type="number"
                  className={`${inputClass} w-32`}
                  value={co.fee}
                  onChange={(e) => updateCourse(i, { fee: Number(e.target.value) })}
                  placeholder="Fee"
                />
                <IconButton danger label="Remove" onClick={() => removeCourse(i)} />
              </div>
            ))}
            <button
              type="button"
              onClick={addCourse}
              className="w-full border-2 border-dashed rounded-lg py-2.5 text-sm font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700"
            >
              + Add course
            </button>
          </SectionCard>

          <div>
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="text-xs text-gray-500 underline"
            >
              {advancedOpen ? "Hide" : "Show"} advanced (raw JSON, profile & goals questions)
            </button>
            {advancedOpen && (
              <div className="mt-3">
                <textarea
                  className="w-full h-64 font-mono text-xs border rounded-lg p-4 bg-white"
                  spellCheck={false}
                  value={JSON.stringify(content, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setContent(parsed);
                    } catch {
                      // ignore invalid JSON while typing
                    }
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 sticky bottom-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-brand-gradient text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-lg disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save new version"}
            </button>
            {status && <span className="text-sm text-gray-600">{status}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
