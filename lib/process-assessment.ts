import { supabaseAdmin } from "@/lib/supabase/admin";
import { transcribeAudio } from "@/lib/transcribe";
import { runScoringEngine, overallScoreToCEFR } from "@/lib/scoring";
import { generateReport } from "@/lib/report";
import { routeToCourse } from "@/lib/routing";

// The full transcribe -> score -> generate-report -> save pipeline for one
// assessment. Used by both the lead-facing submit route (right after they
// finish) and the self-heal cron (to catch anything that got stuck at
// "recording"/"processing" without ever completing, e.g. because the lead
// closed their browser mid-submit).
export async function processAssessment(token: string, extraFields: Record<string, unknown> = {}) {
  const db = supabaseAdmin();

  const { data: assessment, error: fetchErr } = await db
    .from("assessments")
    .select("*, content_versions(content)")
    .eq("token", token)
    .maybeSingle();

  if (fetchErr || !assessment) {
    throw new Error("Assessment not found");
  }

  await db
    .from("assessments")
    .update({ ...extraFields, status: "processing" })
    .eq("token", token);

  if (!assessment.passage_audio_url || !assessment.speaking_audio_url || !assessment.speaking_audio_url_2) {
    await db.from("assessments").update({ status: "failed", report_error: "Missing recordings" }).eq("token", token);
    throw new Error("Missing recordings");
  }

  try {
    return await runPipeline(db, token, assessment, extraFields);
  } catch (err: any) {
    await db
      .from("assessments")
      .update({ status: "failed", report_error: err.message ?? "Unknown error" })
      .eq("token", token);
    throw err;
  }
}

async function runPipeline(db: ReturnType<typeof supabaseAdmin>, token: string, assessment: any, extraFields: Record<string, unknown>) {
  const [passageFile, speakingFile, speakingFile2] = await Promise.all([
    db.storage.from("recordings").download(assessment.passage_audio_url),
    db.storage.from("recordings").download(assessment.speaking_audio_url),
    db.storage.from("recordings").download(assessment.speaking_audio_url_2)
  ]);

  if (passageFile.error || speakingFile.error || speakingFile2.error) {
    throw new Error("Could not read recordings from storage");
  }

  const [passageBuf, speakingBuf, speakingBuf2] = await Promise.all([
    passageFile.data.arrayBuffer(),
    speakingFile.data.arrayBuffer(),
    speakingFile2.data.arrayBuffer()
  ]);

  const [passageTranscription, speakingTranscription, speakingTranscription2] = await Promise.all([
    transcribeAudio(Buffer.from(passageBuf), "passage.webm"),
    transcribeAudio(Buffer.from(speakingBuf), "speaking.webm"),
    transcribeAudio(Buffer.from(speakingBuf2), "speaking2.webm")
  ]);

  // Score with whatever was actually recorded — no minimum duration
  // requirement. A very short or silent recording simply produces a low
  // fluency/intelligibility score rather than being blocked outright.

  const content = assessment.content_versions?.content;
  const passage = (content?.passages ?? []).find((p: any) => p.id === assessment.passage_id) ?? content?.passages?.[0];
  const quiz = content?.quiz ?? [];

  const quizAnswers = (assessment.quiz_answers as Record<string, string>) ?? {};
  let correct = 0;
  const quizErrors: { prompt: string; chosen: string; correct: string; tests: string }[] = [];
  for (const q of quiz) {
    const chosen = quizAnswers[q.id];
    if (chosen === q.correct) {
      correct++;
    } else {
      quizErrors.push({ prompt: q.prompt, chosen: chosen ?? "(no answer)", correct: q.correct, tests: q.tests });
    }
  }
  const quizScorePct = quiz.length ? Math.round((correct / quiz.length) * 100) : 0;

  const provisional = runScoringEngine({
    passageTranscript: passageTranscription.text,
    passage,
    passageWords: passageTranscription.words,
    speakingWords1: speakingTranscription.words,
    speakingWords2: speakingTranscription2.words,
    quizScore: quizScorePct,
    speechGrammarRating: 60,
    vocabularyRating: 60
  });

  let report;
  let reportError: string | null = null;
  try {
    report = await generateReport({
      profile: {
        age_range: assessment.age_range,
        occupation: assessment.occupation,
        mother_tongue: assessment.mother_tongue,
        years_english_use: assessment.years_english_use,
        self_rated_fluency: assessment.self_rated_fluency,
        biggest_struggle: assessment.biggest_struggle
      },
      quizErrors,
      passageTranscript: passageTranscription.text,
      speakingTranscript: `${speakingTranscription.text}\n\n${speakingTranscription2.text}`,
      missedTargetWords: provisional.metrics.missedTargetWords as string[],
      metrics: provisional.metrics,
      scores: {
        intelligibility_score: provisional.intelligibility_score,
        rhythm_score: provisional.rhythm_score,
        fluency_score: provisional.fluency_score,
        grammar_score: provisional.grammar_score,
        vocabulary_score: provisional.vocabulary_score,
        overall_score: provisional.overall_score,
        cefr_fallback: provisional.cefr_fallback
      }
    });
  } catch (err: any) {
    reportError = err.message ?? "LLM report generation failed";
  }

  const final = runScoringEngine({
    passageTranscript: passageTranscription.text,
    passage,
    passageWords: passageTranscription.words,
    speakingWords1: speakingTranscription.words,
    speakingWords2: speakingTranscription2.words,
    quizScore: quizScorePct,
    speechGrammarRating: report?.speech_grammar_rating ?? 60,
    vocabularyRating: report?.vocabulary_rating ?? 60
  });

  const cefr = report?.cefr_level ?? overallScoreToCEFR(final.overall_score);
  const routing = routeToCourse({
    cefr,
    fluency_score: final.fluency_score,
    rhythm_score: final.rhythm_score,
    intelligibility_score: final.intelligibility_score,
    preferredFormat: (extraFields.class_format as string) ?? assessment.class_format,
    courses: content?.courses ?? []
  });

  await db
    .from("assessments")
    .update({
      quiz_score: quizScorePct,
      passage_transcript: passageTranscription.text,
      speaking_transcript: speakingTranscription.text,
      speaking_transcript_2: speakingTranscription2.text,
      passage_words: passageTranscription.words,
      speaking_words: speakingTranscription.words,
      speaking_words_2: speakingTranscription2.words,
      intelligibility_score: final.intelligibility_score,
      rhythm_score: final.rhythm_score,
      fluency_score: final.fluency_score,
      grammar_score: final.grammar_score,
      vocabulary_score: final.vocabulary_score,
      overall_score: final.overall_score,
      metrics: final.metrics,
      recommended_course: routing.recommended,
      alternate_course: routing.alternate,
      report_json: report ?? null,
      report_summary: report?.headline ?? null,
      report_error: reportError,
      status: "complete",
      completed_at: new Date().toISOString()
    })
    .eq("token", token);

  return { status: "complete", reportError };
}
