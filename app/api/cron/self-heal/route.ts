import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateReport } from "@/lib/report";
import { overallScoreToCEFR } from "@/lib/scoring";
import { routeToCourse } from "@/lib/routing";

function authorized(req: NextRequest): boolean {
  const header = req.headers.get("authorization");
  return header === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const results = { reportsHealed: 0, reportsStillFailing: 0, recordingsDeleted: 0 };

  // 1. Re-run report generation for completed assessments missing a report,
  //    using the transcripts already stored (no re-transcription needed).
  const { data: broken } = await db
    .from("assessments")
    .select("*, content_versions(content)")
    .eq("status", "complete")
    .is("report_json", null)
    .not("passage_transcript", "is", null)
    .not("speaking_transcript", "is", null);

  for (const a of broken ?? []) {
    try {
      const content = a.content_versions?.content;
      const report = await generateReport({
        profile: {
          age_range: a.age_range,
          occupation: a.occupation,
          mother_tongue: a.mother_tongue,
          years_english_use: a.years_english_use,
          self_rated_fluency: a.self_rated_fluency,
          biggest_struggle: a.biggest_struggle
        },
        quizErrors: [],
        passageTranscript: a.passage_transcript,
        speakingTranscript: a.speaking_transcript,
        missedTargetWords: (a.metrics as any)?.missedTargetWords ?? [],
        metrics: a.metrics ?? {},
        scores: {
          intelligibility_score: a.intelligibility_score,
          rhythm_score: a.rhythm_score,
          fluency_score: a.fluency_score,
          grammar_score: a.grammar_score,
          vocabulary_score: a.vocabulary_score,
          overall_score: a.overall_score,
          cefr_fallback: overallScoreToCEFR(a.overall_score ?? 0)
        }
      });

      const routing = routeToCourse({
        cefr: report.cefr_level,
        fluency_score: a.fluency_score,
        rhythm_score: a.rhythm_score,
        intelligibility_score: a.intelligibility_score,
        preferredFormat: a.class_format,
        courses: content?.courses ?? []
      });

      await db
        .from("assessments")
        .update({
          report_json: report,
          report_summary: report.headline,
          report_error: null,
          recommended_course: routing.recommended,
          alternate_course: routing.alternate
        })
        .eq("id", a.id);

      results.reportsHealed++;
    } catch (err: any) {
      await db.from("assessments").update({ report_error: err.message }).eq("id", a.id);
      results.reportsStillFailing++;
    }
  }

  // 2. Delete recordings older than 30 days to control storage costs.
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: old } = await db
    .from("assessments")
    .select("token, passage_audio_url, speaking_audio_url")
    .lt("created_at", cutoff)
    .or("passage_audio_url.not.is.null,speaking_audio_url.not.is.null");

  for (const a of old ?? []) {
    const paths = [a.passage_audio_url, a.speaking_audio_url].filter(Boolean) as string[];
    if (paths.length === 0) continue;
    const { error } = await db.storage.from("recordings").remove(paths);
    if (!error) {
      await db
        .from("assessments")
        .update({ passage_audio_url: null, speaking_audio_url: null })
        .eq("token", a.token);
      results.recordingsDeleted += paths.length;
    }
  }

  return NextResponse.json(results);
}
