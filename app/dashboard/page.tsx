import Link from "next/link";
import { getCurrentCounsellor } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border">
      <p className="text-xs text-gray-500 label">{label}</p>
      <p className="text-2xl font-heading font-bold mt-1">{value}</p>
    </div>
  );
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    sent: "bg-gray-100 text-gray-700",
    started: "bg-yellow-100 text-yellow-800",
    recording: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    complete: "bg-green-100 text-green-800",
    insufficient_sample: "bg-orange-100 text-orange-800",
    failed: "bg-red-100 text-red-800"
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-gray-100"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export default async function DashboardPage() {
  const counsellor = await getCurrentCounsellor();
  const db = supabaseAdmin();
  const canSeeAll = counsellor?.role === "admin" || counsellor?.role === "trainer";

  let query = db
    .from("assessments")
    .select("id, status, overall_score, recommended_course, created_at, completed_at, leads(id, name, phone, counsellor_id, counsellors(name))")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!canSeeAll && counsellor) {
    // Only this counsellor's leads. Supabase can't filter a nested relation
    // directly in one call reliably across versions, so fetch lead ids first.
    const { data: myLeads } = await db.from("leads").select("id").eq("counsellor_id", counsellor.id);
    const ids = (myLeads ?? []).map((l) => l.id);
    query = query.in("lead_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }

  const { data: assessments } = await query;

  const today = new Date().toISOString().slice(0, 10);
  const sentCount = assessments?.length ?? 0;
  const inProgress = assessments?.filter((a) => ["started", "recording", "processing"].includes(a.status)).length ?? 0;
  const completedToday =
    assessments?.filter((a) => a.completed_at && a.completed_at.slice(0, 10) === today).length ?? 0;
  const completeCount = assessments?.filter((a) => a.status === "complete").length ?? 0;
  const conversion = sentCount ? Math.round((completeCount / sentCount) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <Link href="/dashboard/new" className="bg-brand-gradient text-white text-sm font-semibold px-4 py-2 rounded-lg">
          + New assessment
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Sent" value={sentCount} />
        <StatCard label="In progress" value={inProgress} />
        <StatCard label="Completed today" value={completedToday} />
        <StatCard label="Conversion" value={`${conversion}%`} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Lead</th>
              <th className="text-left px-4 py-3">Phone</th>
              {canSeeAll && <th className="text-left px-4 py-3">Counsellor</th>}
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Score</th>
              <th className="text-left px-4 py-3">Recommendation</th>
              <th className="text-left px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {(assessments ?? []).map((a: any) => (
              <tr key={a.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/report/${a.id}`} className="font-medium text-brand-pink">
                    {a.leads?.name ?? "—"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{a.leads?.phone ?? "—"}</td>
                {canSeeAll && <td className="px-4 py-3 text-gray-600">{a.leads?.counsellors?.name ?? "—"}</td>}
                <td className="px-4 py-3">{statusBadge(a.status)}</td>
                <td className="px-4 py-3">{a.overall_score ?? "—"}</td>
                <td className="px-4 py-3">{a.recommended_course ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(a.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {(!assessments || assessments.length === 0) && (
              <tr>
                <td colSpan={canSeeAll ? 7 : 6} className="px-4 py-8 text-center text-gray-400">
                  No assessments yet. Create your first link.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
