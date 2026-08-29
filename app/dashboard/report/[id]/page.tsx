import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span>{value ?? "—"}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-brand-gradient" style={{ width: `${value ?? 0}%` }} />
      </div>
    </div>
  );
}

export default async function ReportPage({ params }: { params: { id: string } }) {
  const db = supabaseAdmin();
  const { data: a } = await db
    .from("assessments")
    .select("*, leads(name, phone, email)")
    .eq("id", params.id)
    .maybeSingle();

  if (!a) notFound();

  let passageUrl: string | null = null;
  let speakingUrl: string | null = null;
  if (a.passage_audio_url) {
    const { data } = await db.storage.from("recordings").createSignedUrl(a.passage_audio_url, 3600);
    passageUrl = data?.signedUrl ?? null;
  }
  if (a.speaking_audio_url) {
    const { data } = await db.storage.from("recordings").createSignedUrl(a.speaking_audio_url, 3600);
    speakingUrl = data?.signedUrl ?? null;
  }

  const report = a.report_json as any;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">{a.leads?.name}</h1>
          <p className="text-sm text-gray-500">{a.leads?.phone}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-heading font-extrabold">{report?.cefr_level ?? a.metrics ? a.cefr_fallback : "—"}</p>
          <p className="text-xs text-gray-500">CEFR level</p>
        </div>
      </div>

      {a.status !== "complete" && (
        <div className="mb-6 p-4 rounded-lg bg-yellow-50 text-yellow-800 text-sm">
          Status: {a.status.replace("_", " ")}. Scores/report may still be processing.
        </div>
      )}

      {a.report_error && !report && (
        <div className="mb-6 p-4 rounded-lg bg-orange-50 text-orange-800 text-sm">
          Report couldn't be generated ({a.report_error}). Scores below are still valid.
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white border rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold">Scores</p>
          <ScoreBar label="Overall" value={a.overall_score} />
          <ScoreBar label="Fluency" value={a.fluency_score} />
          <ScoreBar label="Intelligibility" value={a.intelligibility_score} />
          <ScoreBar label="Rhythm" value={a.rhythm_score} />
          <ScoreBar label="Grammar" value={a.grammar_score} />
          <ScoreBar label="Vocabulary" value={a.vocabulary_score} />
        </div>
        <div className="bg-white border rounded-xl p-5 space-y-3">
          <p className="text-sm font-semibold">Recommendation</p>
          <p className="text-lg font-bold text-brand-pink">{a.recommended_course ?? "—"}</p>
          {a.alternate_course && <p className="text-xs text-gray-500">Alternate: {a.alternate_course}</p>}
          {report?.why_this_course && <p className="text-sm text-gray-600 mt-2">{report.why_this_course}</p>}
          <div className="pt-3 border-t space-y-1 text-sm text-gray-600">
            <p>Goal: {a.goal ?? "—"}</p>
            <p>Budget: {a.budget_range ?? "—"}</p>
            <p>Format: {a.class_format ?? "—"}</p>
            <p>Availability: {a.availability ?? "—"}</p>
          </div>
        </div>
      </div>

      {report && (
        <div className="bg-white border rounded-xl p-5 space-y-4 mb-6">
          <p className="text-sm font-semibold">{report.headline}</p>
          <div>
            <p className="text-xs uppercase text-gray-400 mb-1">Strengths</p>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-0.5">
              {(report.strengths ?? []).map((s: string, i: number) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-400 mb-1">Growth areas</p>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-0.5">
              {(report.growth_areas ?? []).map((s: string, i: number) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-400 mb-1">Speech observations</p>
            <p className="text-sm text-gray-700">{report.speech_observations}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-400 mb-1">Grammar notes</p>
            <p className="text-sm text-gray-700">{report.grammar_notes}</p>
          </div>
          {report.pronunciation_patterns?.length > 0 && (
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Likely pronunciation patterns (inferred)</p>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-0.5">
                {report.pronunciation_patterns.map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {report.counsellor_notes && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs uppercase text-gray-400 mb-1">Counsellor notes (private — not shown to lead)</p>
              <p className="text-sm text-gray-700">{report.counsellor_notes}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {passageUrl && (
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs uppercase text-gray-400 mb-2">Read-aloud passage</p>
            <audio controls src={passageUrl} className="w-full" />
            {a.passage_transcript && <p className="text-xs text-gray-500 mt-2">{a.passage_transcript}</p>}
          </div>
        )}
        {speakingUrl && (
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs uppercase text-gray-400 mb-2">Open speaking</p>
            <audio controls src={speakingUrl} className="w-full" />
            {a.speaking_transcript && <p className="text-xs text-gray-500 mt-2">{a.speaking_transcript}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
