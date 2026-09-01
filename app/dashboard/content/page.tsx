"use client";

import { useEffect, useState } from "react";
import type { AssessmentContent, ProfileQuestion, QuizQuestion, Passage, Course } from "@/lib/content-types";

function uid() {
  return Math.random().toString(36).slice(2, 8);
}

const inputCls =
  "w-full bg-[#161310] border border-[#2a2419] rounded-lg px-3 py-2 text-sm text-[#f2ede1] placeholder:text-[#6b6459]";
const cardCls = "bg-[#0d0b08] border border-[#221d15] rounded-xl p-5";
const innerCardCls = "bg-[#161310] border border-[#2a2419] rounded-lg p-4";
const smallLabel = "text-xs text-[#9a9282] block mb-1";
const removeBtnCls = "text-xs text-red-400 border border-red-900/40 rounded-lg px-2.5 py-1 hover:bg-red-950/30";
const addBtnCls = "text-xs text-brand-gold border border-[#3a2f1a] rounded-lg px-3 py-1.5 hover:bg-[#221d15]";
const sectionTitleCls = "text-base font-semibold text-[#f2ede1] mb-1";
const sectionDescCls = "text-xs text-[#7d7568] mb-4";

export default function ContentEditorPage() {
  const [content, setContent] = useState<AssessmentContent | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/content")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setStatus(data.error);
        } else {
          setContent(data.content);
          setVersion(data.version);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!content) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error ?? "Save failed");
      } else {
        setVersion(data.version);
        setStatus(`Saved as version ${data.version}. Existing reports stay tied to their original version.`);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[#7d7568]">Loading...</p>;
  }

  if (!content) {
    return <p className="text-sm text-red-400">{status ?? "Could not load content."}</p>;
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-[#f2ede1]">Edit questions</h1>
        {version && <span className="text-xs text-[#7d7568]">Active version: {version}</span>}
      </div>
      <p className="text-sm text-[#9a9282] mb-6">
        Add or edit what candidates see. Saving creates a new version — assessments already taken keep
        pointing at their original version, so old reports never change retroactively.
      </p>

      <div className="space-y-6">
        {/* ---------------- QUIZ ---------------- */}
        <div className={cardCls}>
          <p className={sectionTitleCls}>Quiz questions</p>
          <p className={sectionDescCls}>Multiple-choice grammar/vocab questions.</p>
          <div className="space-y-4">
            {content.quiz.map((q, qi) => (
              <div key={q.id} className={innerCardCls}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-[#f2ede1]">Question {qi + 1}</p>
                  <button
                    className={removeBtnCls}
                    onClick={() =>
                      setContent({ ...content, quiz: content.quiz.filter((_, i) => i !== qi) })
                    }
                  >
                    Remove
                  </button>
                </div>

                <label className={smallLabel}>Question text</label>
                <input
                  className={inputCls + " mb-3"}
                  value={q.prompt}
                  onChange={(e) => {
                    const quiz = [...content.quiz];
                    quiz[qi] = { ...q, prompt: e.target.value };
                    setContent({ ...content, quiz });
                  }}
                />

                <label className={smallLabel}>What this tests (internal label)</label>
                <input
                  className={inputCls + " mb-3"}
                  value={q.tests}
                  onChange={(e) => {
                    const quiz = [...content.quiz];
                    quiz[qi] = { ...q, tests: e.target.value };
                    setContent({ ...content, quiz });
                  }}
                />

                <div className="grid grid-cols-2 gap-3 mb-3">
                  {q.options.map((opt, oi) => (
                    <div key={opt.key} className="flex items-center gap-2">
                      <span className="text-xs text-[#7d7568] w-4">{opt.key.toUpperCase()}</span>
                      <input
                        className={inputCls}
                        value={opt.text}
                        onChange={(e) => {
                          const quiz = [...content.quiz];
                          const options = [...q.options];
                          options[oi] = { ...opt, text: e.target.value };
                          quiz[qi] = { ...q, options };
                          setContent({ ...content, quiz });
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-[#9a9282]">Correct answer</label>
                    <select
                      value={q.correct}
                      onChange={(e) => {
                        const quiz = [...content.quiz];
                        quiz[qi] = { ...q, correct: e.target.value };
                        setContent({ ...content, quiz });
                      }}
                      className="bg-[#0d0b08] border border-[#2a2419] rounded-lg px-2 py-1 text-xs text-[#f2ede1]"
                    >
                      {q.options.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.key.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-[#9a9282]">
                    <input
                      type="checkbox"
                      checked={q.advanced}
                      onChange={(e) => {
                        const quiz = [...content.quiz];
                        quiz[qi] = { ...q, advanced: e.target.checked };
                        setContent({ ...content, quiz });
                      }}
                    />
                    Advanced question
                  </label>
                </div>
              </div>
            ))}
          </div>
          <button
            className={addBtnCls + " mt-4"}
            onClick={() => {
              const newQ: QuizQuestion = {
                id: `q${uid()}`,
                prompt: "",
                options: [
                  { key: "a", text: "" },
                  { key: "b", text: "" },
                  { key: "c", text: "" },
                  { key: "d", text: "" }
                ],
                correct: "a",
                tests: "",
                advanced: false
              };
              setContent({ ...content, quiz: [...content.quiz, newQ] });
            }}
          >
            + Add question
          </button>
        </div>

        {/* ---------------- PASSAGE ---------------- */}
        <div className={cardCls}>
          <p className={sectionTitleCls}>Read-aloud passage</p>
          <p className={sectionDescCls}>The text a lead reads aloud. Target words count double if missed.</p>
          <div className="space-y-4">
            {content.passages.map((p, pi) => (
              <div key={p.id} className={innerCardCls}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-[#f2ede1]">Passage {pi + 1}</p>
                  {content.passages.length > 1 && (
                    <button
                      className={removeBtnCls}
                      onClick={() =>
                        setContent({ ...content, passages: content.passages.filter((_, i) => i !== pi) })
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
                <label className={smallLabel}>Passage text</label>
                <textarea
                  className={inputCls + " mb-3 h-24"}
                  value={p.text}
                  onChange={(e) => {
                    const passages = [...content.passages];
                    passages[pi] = { ...p, text: e.target.value };
                    setContent({ ...content, passages });
                  }}
                />
                <label className={smallLabel}>Target words (comma separated)</label>
                <input
                  className={inputCls}
                  value={p.targetWords.map((w) => w.word).join(", ")}
                  onChange={(e) => {
                    const passages = [...content.passages];
                    passages[pi] = {
                      ...p,
                      targetWords: e.target.value
                        .split(",")
                        .map((w) => w.trim())
                        .filter(Boolean)
                        .map((word) => ({ word }))
                    };
                    setContent({ ...content, passages });
                  }}
                />
              </div>
            ))}
          </div>
          <button
            className={addBtnCls + " mt-4"}
            onClick={() => {
              const newP: Passage = { id: `p${uid()}`, text: "", targetWords: [] };
              setContent({ ...content, passages: [...content.passages, newP] });
            }}
          >
            + Add passage
          </button>
        </div>

        {/* ---------------- SPEAKING PROMPTS ---------------- */}
        <div className={cardCls}>
          <p className={sectionTitleCls}>Open speaking prompts</p>
          <p className={sectionDescCls}>One is chosen at random per assessment.</p>
          <div className="space-y-2">
            {content.speakingPrompts.map((prompt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className={inputCls}
                  value={prompt}
                  onChange={(e) => {
                    const prompts = [...content.speakingPrompts];
                    prompts[i] = e.target.value;
                    setContent({ ...content, speakingPrompts: prompts });
                  }}
                />
                <button
                  className={removeBtnCls}
                  onClick={() =>
                    setContent({
                      ...content,
                      speakingPrompts: content.speakingPrompts.filter((_, idx) => idx !== i)
                    })
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            className={addBtnCls + " mt-3"}
            onClick={() => setContent({ ...content, speakingPrompts: [...content.speakingPrompts, ""] })}
          >
            + Add prompt
          </button>
        </div>

        {/* ---------------- PROFILE QUESTIONS ---------------- */}
        <ProfileQuestionsSection
          title="Profile questions"
          description="Asked before the quiz — age, occupation, self-rating, etc."
          questions={content.profileQuestions}
          onChange={(profileQuestions) => setContent({ ...content, profileQuestions })}
        />

        {/* ---------------- GOALS QUESTIONS ---------------- */}
        <ProfileQuestionsSection
          title="Goals & budget questions"
          description="Asked at the end — used for the counsellor's routing/recommendation."
          questions={content.goalsQuestions}
          onChange={(goalsQuestions) => setContent({ ...content, goalsQuestions })}
        />

        {/* ---------------- COURSES ---------------- */}
        <div className={cardCls}>
          <p className={sectionTitleCls}>Courses / tracks</p>
          <p className={sectionDescCls}>Used by the routing table to recommend a course from the scores.</p>
          <div className="space-y-3">
            {content.courses.map((c, ci) => (
              <div key={ci} className="flex items-center gap-2">
                <input
                  className={inputCls}
                  placeholder="Name"
                  value={c.name}
                  onChange={(e) => {
                    const courses = [...content.courses];
                    courses[ci] = { ...c, name: e.target.value };
                    setContent({ ...content, courses });
                  }}
                />
                <input
                  type="number"
                  className={inputCls + " w-28"}
                  placeholder="Sessions"
                  value={c.sessions}
                  onChange={(e) => {
                    const courses = [...content.courses];
                    courses[ci] = { ...c, sessions: Number(e.target.value) };
                    setContent({ ...content, courses });
                  }}
                />
                <input
                  type="number"
                  className={inputCls + " w-28"}
                  placeholder="Fee"
                  value={c.fee}
                  onChange={(e) => {
                    const courses = [...content.courses];
                    courses[ci] = { ...c, fee: Number(e.target.value) };
                    setContent({ ...content, courses });
                  }}
                />
                <button
                  className={removeBtnCls}
                  onClick={() =>
                    setContent({ ...content, courses: content.courses.filter((_, i) => i !== ci) })
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            className={addBtnCls + " mt-3"}
            onClick={() => {
              const newCourse: Course = { name: "", sessions: 0, fee: 0 };
              setContent({ ...content, courses: [...content.courses, newCourse] });
            }}
          >
            + Add course
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-6 sticky bottom-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand-gradient text-brand-black text-sm font-bold px-5 py-2.5 rounded-lg disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save new version"}
        </button>
        {status && <span className="text-sm text-[#9a9282]">{status}</span>}
      </div>
    </div>
  );
}

function ProfileQuestionsSection({
  title,
  description,
  questions,
  onChange
}: {
  title: string;
  description: string;
  questions: ProfileQuestion[];
  onChange: (questions: ProfileQuestion[]) => void;
}) {
  return (
    <div className={cardCls}>
      <p className={sectionTitleCls}>{title}</p>
      <p className={sectionDescCls}>{description}</p>
      <div className="space-y-4">
        {questions.map((q, qi) => (
          <div key={q.id} className={innerCardCls}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-[#f2ede1]">{q.label || `Question ${qi + 1}`}</p>
              <button
                className={removeBtnCls}
                onClick={() => onChange(questions.filter((_, i) => i !== qi))}
              >
                Remove
              </button>
            </div>

            <label className={smallLabel}>Label</label>
            <input
              className={inputCls + " mb-3"}
              value={q.label}
              onChange={(e) => {
                const updated = [...questions];
                updated[qi] = { ...q, label: e.target.value } as ProfileQuestion;
                onChange(updated);
              }}
            />

            <label className={smallLabel}>Type</label>
            <select
              className={inputCls + " mb-3"}
              value={q.type}
              onChange={(e) => {
                const type = e.target.value as ProfileQuestion["type"];
                const updated = [...questions];
                if (type === "choice") {
                  updated[qi] = { id: q.id, label: q.label, type: "choice", options: [""] };
                } else if (type === "slider") {
                  updated[qi] = { id: q.id, label: q.label, type: "slider", min: 1, max: 10 };
                } else {
                  updated[qi] = { id: q.id, label: q.label, type: "text" };
                }
                onChange(updated);
              }}
            >
              <option value="choice">Choice</option>
              <option value="slider">Slider</option>
              <option value="text">Text</option>
            </select>

            {q.type === "choice" && (
              <>
                <label className={smallLabel}>Options (comma separated)</label>
                <input
                  className={inputCls}
                  value={q.options.join(", ")}
                  onChange={(e) => {
                    const updated = [...questions];
                    updated[qi] = {
                      ...q,
                      options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean)
                    } as ProfileQuestion;
                    onChange(updated);
                  }}
                />
              </>
            )}

            {q.type === "slider" && (
              <div className="flex gap-3">
                <div>
                  <label className={smallLabel}>Min</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={q.min}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[qi] = { ...q, min: Number(e.target.value) } as ProfileQuestion;
                      onChange(updated);
                    }}
                  />
                </div>
                <div>
                  <label className={smallLabel}>Max</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={q.max}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[qi] = { ...q, max: Number(e.target.value) } as ProfileQuestion;
                      onChange(updated);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        className={addBtnCls + " mt-4"}
        onClick={() => {
          const newQ: ProfileQuestion = { id: `f${uid()}`, label: "", type: "text" };
          onChange([...questions, newQ]);
        }}
      >
        + Add question
      </button>
    </div>
  );
}
