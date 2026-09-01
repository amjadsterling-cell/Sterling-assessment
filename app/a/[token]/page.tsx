"use client";

import { useEffect, useState } from "react";
import { useRecorder, type RecorderState } from "@/lib/useRecorder";

type ProfileQ = {
  id: string;
  label: string;
  type: "choice" | "slider" | "text";
  options?: string[];
  min?: number;
  max?: number;
};

type QuizQ = {
  id: string;
  prompt: string;
  options: { key: string; text: string }[];
};

type Content = {
  profileQuestions: ProfileQ[];
  quiz: QuizQ[];
  passage: { id: string; text: string } | null;
  speakingPrompt1: string | null;
  speakingPrompt2: string | null;
  goalsQuestions: ProfileQ[];
};

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-6">
      <div
        className="h-full bg-brand-gradient transition-all"
        style={{ width: `${(step / total) * 100}%` }}
      />
    </div>
  );
}

function QuestionField({
  q,
  value,
  onChange
}: {
  q: ProfileQ;
  value: any;
  onChange: (v: any) => void;
}) {
  if (q.type === "choice") {
    return (
      <div className="space-y-2">
        {q.options?.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`w-full text-left px-4 py-3 rounded-lg border text-sm ${
              value === opt ? "border-brand-goldDark bg-brand-goldDark/5 font-semibold" : "border-gray-200"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }
  if (q.type === "slider") {
    return (
      <div>
        <input
          type="range"
          min={q.min}
          max={q.max}
          value={value ?? q.min}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full"
        />
        <p className="text-center text-2xl font-bold mt-2">{value ?? q.min}</p>
      </div>
    );
  }
  return (
    <input
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border rounded-lg px-4 py-3 text-sm"
    />
  );
}

// Shared UI for a single speaking-recording step. Used twice (prompt 1 and
// prompt 2) so the recording/re-record/upload behavior is identical for both.
function SpeakingStep({
  title,
  prompt,
  recorder,
  rerecordUsed,
  onRerecord,
  onUse
}: {
  title: string;
  prompt: string;
  recorder: ReturnType<typeof useRecorder>;
  rerecordUsed: boolean;
  onRerecord: () => void;
  onUse: () => void;
}) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="bg-white border rounded-xl p-4 text-sm">{prompt}</div>
      <p className="text-xs text-gray-500">Aim for 60-90 seconds. Speak naturally — there's no wrong answer.</p>

      {recorder.state === "idle" && (
        <button onClick={recorder.start} className="w-full bg-brand-gradient text-white font-semibold rounded-lg py-3">
          Start recording
        </button>
      )}

      {recorder.state === "recording" && (
        <div className="text-center space-y-3">
          <p className={`font-semibold ${recorder.elapsed < 60 ? "text-yellow-600" : "text-green-600"}`}>
            Recording... {recorder.elapsed}s {recorder.elapsed < 60 && "(aim for at least 60s)"}
          </p>
          <button onClick={recorder.stop} className="w-full bg-brand-black text-white font-semibold rounded-lg py-3">
            Stop
          </button>
        </div>
      )}

      {recorder.state === "stopped" && recorder.blob && (
        <div className="space-y-3">
          <audio controls src={URL.createObjectURL(recorder.blob)} className="w-full" />
          <div className="flex gap-2">
            {!rerecordUsed && (
              <button onClick={onRerecord} className="flex-1 border border-gray-300 rounded-lg py-3 text-sm font-semibold">
                Re-record (1 left)
              </button>
            )}
            <button onClick={onUse} className="flex-1 bg-brand-gradient text-white font-semibold rounded-lg py-3">
              Use this recording
            </button>
          </div>
        </div>
      )}

      {recorder.error && <p className="text-sm text-red-500">{recorder.error}</p>}
    </div>
  );
}

export default function AssessmentPage({ params }: { params: { token: string } }) {
  const [content, setContent] = useState<Content | null>(null);
  const [step, setStep] = useState(1);
  const [micOk, setMicOk] = useState<boolean | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [goals, setGoals] = useState<Record<string, any>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const passageRecorder = useRecorder();
  const speakingRecorder1 = useRecorder();
  const speakingRecorder2 = useRecorder();
  const [passageRerecordUsed, setPassageRerecordUsed] = useState(false);
  const [speakingRerecordUsed1, setSpeakingRerecordUsed1] = useState(false);
  const [speakingRerecordUsed2, setSpeakingRerecordUsed2] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Steps: 1 welcome, 2 profile, 3 quiz, 4 passage, 5 speaking#1, 6 speaking#2, 7 goals, 8 submit.
  const TOTAL_STEPS = 8;

  useEffect(() => {
    fetch(`/api/assessments/${params.token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setLoadError(data.error);
        } else {
          setContent(data.content);
          setAnswers(data.saved ?? {});
          setQuizAnswers(data.saved?.quiz_answers ?? {});
          setGoals({
            goal: data.saved?.goal,
            budget_range: data.saved?.budget_range,
            availability: data.saved?.availability,
            class_format: data.saved?.class_format
          });
        }
      })
      .catch(() => setLoadError("Could not load assessment"));
  }, [params.token]);

  function autosave(fields: Record<string, unknown>) {
    fetch(`/api/assessments/${params.token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields)
    }).catch(() => {});
  }

  function next() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  async function startPassageCountdown() {
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c === null) return null;
        if (c <= 1) {
          clearInterval(interval);
          passageRecorder.start();
          return null;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function uploadRecording(kind: "passage" | "speaking1" | "speaking2", blob: Blob) {
    const form = new FormData();
    form.append("kind", kind);
    form.append("audio", blob, `${kind}.webm`);
    await fetch(`/api/assessments/${params.token}/upload`, { method: "POST", body: form }).catch(() => {});
  }

  async function handleSubmit() {
    setSubmitting(true);
    autosave({ goal: goals.goal, budget_range: goals.budget_range, availability: goals.availability, class_format: goals.class_format });
    // Fire the scoring pipeline without blocking the lead — analysis runs in
    // the background; the lead never sees a score.
    fetch(`/api/assessments/${params.token}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(goals)
    }).catch(() => {});
    setDone(true);
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-gray-500">{loadError}</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center bg-gray-50">
        <div>
          <div className="w-16 h-16 rounded-full bg-brand-gradient mx-auto mb-4" />
          <h1 className="text-2xl font-heading font-bold mb-2">Thank you!</h1>
          <p className="text-gray-500 max-w-xs mx-auto">
            Your assessment has been submitted. Your counsellor will be in touch with your results.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center">
      <div className="w-full max-w-md p-5 pt-8">
        <ProgressBar step={step} total={TOTAL_STEPS} />

        {step === 1 && (
          <div>
            <h1 className="text-xl font-bold mb-2">Welcome</h1>
            <p className="text-sm text-gray-500 mb-6">
              This takes about 12 minutes. You'll answer a few questions, take a short grammar quiz, and
              record a few short audio clips. Make sure you're somewhere reasonably quiet.
            </p>
            <button
              onClick={async () => {
                const ok = await passageRecorder.checkMic();
                setMicOk(ok);
                if (ok) next();
              }}
              className="w-full bg-brand-gradient text-white font-semibold rounded-lg py-3"
            >
              Check microphone & start
            </button>
            {micOk === false && (
              <p className="text-sm text-red-500 mt-3">
                Microphone access is required. Please allow it in your browser settings and try again.
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            {content.profileQuestions.map((q) => (
              <div key={q.id}>
                <label className="block text-sm font-semibold mb-2">{q.label}</label>
                <QuestionField
                  q={q}
                  value={answers[q.id]}
                  onChange={(v) => {
                    const updated = { ...answers, [q.id]: v };
                    setAnswers(updated);
                    autosave({ [q.id]: v });
                  }}
                />
              </div>
            ))}
            <button onClick={next} className="w-full bg-brand-gradient text-white font-semibold rounded-lg py-3">
              Continue
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold">Quick grammar check</h2>
            {content.quiz.map((q) => (
              <div key={q.id}>
                <p className="text-sm font-semibold mb-2">{q.prompt}</p>
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        const updated = { ...quizAnswers, [q.id]: opt.key };
                        setQuizAnswers(updated);
                        autosave({ quiz_answers: updated });
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg border text-sm ${
                        quizAnswers[q.id] === opt.key ? "border-brand-goldDark bg-brand-goldDark/5 font-semibold" : "border-gray-200"
                      }`}
                    >
                      {opt.text}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={next} className="w-full bg-brand-gradient text-white font-semibold rounded-lg py-3">
              Continue
            </button>
          </div>
        )}

        {step === 4 && content.passage && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold">Read this aloud</h2>
            <div className="bg-white border rounded-xl p-4 text-sm leading-relaxed">{content.passage.text}</div>

            {countdown !== null && (
              <p className="text-center text-4xl font-bold">{countdown}</p>
            )}

            {passageRecorder.state === "idle" && countdown === null && (
              <button onClick={startPassageCountdown} className="w-full bg-brand-gradient text-white font-semibold rounded-lg py-3">
                Start recording (5s countdown)
              </button>
            )}

            {passageRecorder.state === "recording" && (
              <div className="text-center space-y-3">
                <p className="text-red-500 font-semibold animate-pulse">Recording... {passageRecorder.elapsed}s</p>
                <button onClick={passageRecorder.stop} className="w-full bg-brand-black text-white font-semibold rounded-lg py-3">
                  Stop
                </button>
              </div>
            )}

            {passageRecorder.state === "stopped" && passageRecorder.blob && (
              <div className="space-y-3">
                <audio controls src={URL.createObjectURL(passageRecorder.blob)} className="w-full" />
                <div className="flex gap-2">
                  {!passageRerecordUsed && (
                    <button
                      onClick={() => {
                        setPassageRerecordUsed(true);
                        passageRecorder.reset();
                      }}
                      className="flex-1 border border-gray-300 rounded-lg py-3 text-sm font-semibold"
                    >
                      Re-record (1 left)
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      await uploadRecording("passage", passageRecorder.blob!);
                      next();
                    }}
                    className="flex-1 bg-brand-gradient text-white font-semibold rounded-lg py-3"
                  >
                    Use this recording
                  </button>
                </div>
              </div>
            )}

            {passageRecorder.error && <p className="text-sm text-red-500">{passageRecorder.error}</p>}
          </div>
        )}

        {step === 5 && content.speakingPrompt1 && (
          <SpeakingStep
            title="Speak freely (1 of 2)"
            prompt={content.speakingPrompt1}
            recorder={speakingRecorder1}
            rerecordUsed={speakingRerecordUsed1}
            onRerecord={() => {
              setSpeakingRerecordUsed1(true);
              speakingRecorder1.reset();
            }}
            onUse={async () => {
              await uploadRecording("speaking1", speakingRecorder1.blob!);
              next();
            }}
          />
        )}

        {step === 6 && content.speakingPrompt2 && (
          <SpeakingStep
            title="Speak freely (2 of 2)"
            prompt={content.speakingPrompt2}
            recorder={speakingRecorder2}
            rerecordUsed={speakingRerecordUsed2}
            onRerecord={() => {
              setSpeakingRerecordUsed2(true);
              speakingRecorder2.reset();
            }}
            onUse={async () => {
              await uploadRecording("speaking2", speakingRecorder2.blob!);
              next();
            }}
          />
        )}

        {step === 7 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold">Almost done</h2>
            {content.goalsQuestions.map((q) => (
              <div key={q.id}>
                <label className="block text-sm font-semibold mb-2">{q.label}</label>
                <QuestionField
                  q={q}
                  value={goals[q.id]}
                  onChange={(v) => setGoals((g) => ({ ...g, [q.id]: v }))}
                />
              </div>
            ))}
            <button onClick={next} className="w-full bg-brand-gradient text-white font-semibold rounded-lg py-3">
              Continue
            </button>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-6 text-center">
            <h2 className="text-lg font-bold">Ready to submit</h2>
            <p className="text-sm text-gray-500">
              That's everything. Your counsellor will review your results and reach out with next steps.
            </p>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-brand-gradient text-white font-semibold rounded-lg py-3 disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit assessment"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
