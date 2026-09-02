export type ReportInput = {
  profile: {
    age_range?: string;
    occupation?: string;
    mother_tongue?: string;
    years_english_use?: string;
    self_rated_fluency?: number;
    biggest_struggle?: string;
  };
  quizErrors: { prompt: string; chosen: string; correct: string; tests: string }[];
  passageTranscript: string;
  speakingTranscript: string;
  missedTargetWords: string[];
  metrics: Record<string, unknown>;
  scores: {
    intelligibility_score: number;
    rhythm_score: number;
    fluency_score: number;
    grammar_score: number;
    vocabulary_score: number;
    overall_score: number;
    cefr_fallback: string;
  };
};

export type ReportOutput = {
  headline: string;
  strengths: string[];
  growth_areas: string[];
  speech_observations: string;
  grammar_notes: string;
  speech_grammar_rating: number;
  vocabulary_rating: number;
  cefr_level: string;
  pronunciation_patterns: string[];
  syllable_stress_notes: string;
  why_this_course: string;
  counsellor_notes: string;
  pitch_notes_ml?: string;
};

const SYSTEM_PROMPT = `You are an assessment analyst for a spoken-English coaching business.
You will be given a learner's profile, grammar-quiz errors, two transcripts (a read-aloud
passage and a free-speech answer), missed pronunciation target words, and computed metrics.

Respond with STRICT JSON ONLY — no markdown fences, no preamble, no commentary — matching
exactly this shape:
{
  "headline": string,
  "strengths": string[],
  "growth_areas": string[],
  "speech_observations": string,
  "grammar_notes": string,
  "speech_grammar_rating": number (0-100),
  "vocabulary_rating": number (0-100),
  "cefr_level": "A1"|"A2"|"B1"|"B2"|"C1"|"C2",
  "pronunciation_patterns": string[],
  "syllable_stress_notes": string,
  "why_this_course": string,
  "counsellor_notes": string,
  "pitch_notes_ml": string
}

Rules:
- pronunciation_patterns are INFERRED from the transcript/metrics — never claim to have
  measured actual phonemes or audio directly; phrase these as likely patterns.
- counsellor_notes is private and can be candid/direct — it is never shown to the learner.
- Base cefr_level on fluency, vocabulary, grammar, and intelligibility together, not on the
  quiz score alone.
- Keep every field grounded in the data given. Do not invent facts about the learner.`;

async function callGemini(userContent: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const model = "gemini-3.6-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: userContent }] }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini call failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");
  return text;
}

/**
 * Generates the learner report. Retries transient failures up to 3 times
 * (per build spec reliability rules). Throws on final failure — callers are
 * responsible for saving scores anyway and setting report_error rather than
 * silently marking the assessment "complete" with no report.
 */
export async function generateReport(input: ReportInput): Promise<ReportOutput> {
  const userContent = JSON.stringify(input, null, 2);

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const raw = await callGemini(userContent);
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned) as ReportOutput;
      return parsed;
    } catch (err) {
      lastError = err;
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
  }
  throw lastError;
}
