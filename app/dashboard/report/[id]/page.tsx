import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildReportFromAssessment } from "@/lib/build-report-from-assessment";
import DownloadReportButton from "./download-report-button";
import ReportView from "./report-view";

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

  const report = buildReportFromAssessment(a);

  return (
    <div className="max-w-5xl print:bg-white print:text-black">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <img src="/logo.png" alt="Sterling" className="h-8 w-auto" />
        <DownloadReportButton />
      </div>

      {/* HEADER */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-5 mb-5 print:border-gray-300">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-white print:text-black">{report.student.name}</h1>
            <p className="text-sm text-gray-400 mt-1 print:text-gray-600">
              {report.student.contact ?? "Contact not provided"} · Assessed{" "}
              {new Date(report.student.assessmentDate).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wide print:text-gray-600">CEFR</p>
              <p className="text-2xl font-bold text-brand-gold">{report.student.cefrLevel}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wide print:text-gray-600">Overall</p>
              <p className="text-2xl font-bold text-white print:text-black">{report.student.overallScore}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-400/15 text-green-300 capitalize">
              {report.student.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </div>

      {a.status === "complete_partial" && (
        <div className="mb-5 p-4 rounded-lg bg-orange-400/10 border border-orange-900/40 text-orange-300 text-sm">
          This candidate didn't finish the full assessment. Scores below reflect only what they actually
          recorded/answered before leaving.
        </div>
      )}

      {a.status !== "complete" && a.status !== "complete_partial" && (
        <div className="mb-5 p-4 rounded-lg bg-yellow-400/10 border border-yellow-900/40 text-yellow-300 text-sm">
          Status: {a.status.replace(/_/g, " ")}. Scores/report may still be processing.
        </div>
      )}

      {a.report_error && !a.report_json && (
        <div className="mb-5 p-4 rounded-lg bg-orange-400/10 border border-orange-900/40 text-orange-300 text-sm">
          Report couldn't be generated ({a.report_error}). Scores below are still valid.
        </div>
      )}

      <ReportView report={report} />

      {/* RECORDINGS — kept outside the tabs so they're always reachable */}
      {(passageUrl || speakingUrl) && (
        <div className="grid grid-cols-2 gap-5 mt-5 print:mt-6">
          {passageUrl && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 print:border-gray-300">
              <p className="text-xs uppercase text-gray-400 mb-2 print:text-gray-600">Read-aloud passage</p>
              <audio controls src={passageUrl} className="w-full print:hidden" />
              {a.passage_transcript && (
                <p className="text-xs text-gray-400 mt-2 print:text-gray-700">{a.passage_transcript}</p>
              )}
            </div>
          )}
          {speakingUrl && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 print:border-gray-300">
              <p className="text-xs uppercase text-gray-400 mb-2 print:text-gray-600">Open speaking</p>
              <audio controls src={speakingUrl} className="w-full print:hidden" />
              {a.speaking_transcript && (
                <p className="text-xs text-gray-400 mt-2 print:text-gray-700">{a.speaking_transcript}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
