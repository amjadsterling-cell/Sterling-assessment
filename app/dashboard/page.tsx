import Link from "next/link";
import { getCurrentCounsellor } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import DeleteLeadButton from "./delete-lead-button";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <p className="text-xs text-gray-400 label">{label}</p>
      <p className="text-2xl font-heading font-bold mt-1 text-white">{value}</p>
    </div>
  );
}

const STATUS_OPTIONS = ["sent", "started", "recording", "processing", "complete", "insufficient_sample", "failed"];
const TOTAL_STEPS = 8; // keep in sync with app/a/[token]/page.tsx

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    sent: "bg-white/10 text-gray-300",
    started: "bg-yellow-400/15 text-yellow-300",
    recording: "bg-yellow-400/15 text-yellow-300",
    processing: "bg-blue-400/15 text-blue-300",
    complete: "bg-green-400/15 text-green-300",
    insufficient_sample: "bg-orange-400/15 text-orange-300",
    failed: "bg-red-400/15 text-red-300"
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-white/10 text-gray-300"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams: { counsellor?: string; status?: string; date?: string; q?: string };
}) {
  const counsellor = await getCurrentCounsellor();
  const db = supabaseAdmin();

  // Only admins see everyone's assessments. Trainers and counsellors both
  // only see the leads assigned to them.
  const isAdmin = counsellor?.role === "admin";

  const counsellorFilter = searchParams.counsellor ?? "";
  const statusFilter = searchParams.status ?? "";
  const dateFilter = searchParams.date ?? "";
  const q = (searchParams.q ?? "").trim();

  // Load the counsellor list for the filter dropdown (admin only).
  let counsellorOptions: { id: string; name: string }[] = [];
  if (isAdmin) {
    const { data } = await db.from("counsellors").select("id, name").order("name");
    counsellorOptions = data ?? [];
  }

  let query = db
    .from("assessments")
    .select(
      "id, status, overall_score, recommended_course, created_at, completed_at, current_step, leads(id, name, phone, counsellor_id, counsellors(name))"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  // Resolve which leads this query should be restricted to, if any of:
  // not-admin, a counsellor filter, or a name/phone search is active.
  const needsLeadRestriction = !isAdmin || counsellorFilter || q;
  if (needsLeadRestriction) {
    let leadQuery = db.from("leads").select("id");
    if (!isAdmin && counsellor) {
      leadQuery = leadQuery.eq("counsellor_id", counsellor.id);
    } else if (isAdmin && counsellorFilter) {
      leadQuery = leadQuery.eq("counsellor_id", counsellorFilter);
    }
    if (q) {
      leadQuery = leadQuery.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
    }
    const { data: leads } = await leadQuery;
    const ids = (leads ?? []).map((l) => l.id);
    query = query.in("lead_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }
  if (dateFilter) {
    const start = `${dateFilter}T00:00:00.000Z`;
    const end = `${dateFilter}T23:59:59.999Z`;
    query = query.gte("created_at", start).lte("created_at", end);
  }

  const { data: assessments } = await query;

  const today = new Date().toISOString().slice(0, 10);
  const sentCount = assessments?.length ?? 0;
  const inProgress = assessments?.filter((a) => ["started", "recording", "processing"].includes(a.status)).length ?? 0;
  const completedToday =
    assessments?.filter((a) => a.completed_at && a.completed_at.slice(0, 10) === today).length ?? 0;
  const completeCount = assessments?.filter((a) => a.status === "complete").length ?? 0;
  const conversion = sentCount ? Math.round((completeCount / sentCount) * 100) : 0;

  const hasActiveFilters = counsellorFilter || statusFilter || dateFilter || q;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
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

      <form method="get" className="bg-white/5 rounded-xl border border-white/10 p-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs text-gray-400 block mb-1">Search (name or phone)</label>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="e.g. Amjad or 8590..."
            className="w-full h-10 bg-white/5 border border-white/15 rounded-lg px-3 text-sm text-white placeholder:text-gray-500"
          />
        </div>

        {isAdmin && (
          <div className="min-w-[160px]">
            <label className="text-xs text-gray-400 block mb-1">Counsellor</label>
            <select
              name="counsellor"
              defaultValue={counsellorFilter}
              className="w-full h-10 bg-white/5 border border-white/15 rounded-lg px-3 text-sm text-white"
            >
              <option value="" className="bg-[#0b0b12] text-white">All counsellors</option>
              {counsellorOptions.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#0b0b12] text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="min-w-[160px]">
          <label className="text-xs text-gray-400 block mb-1">Status</label>
          <select
            name="status"
            defaultValue={statusFilter}
            className="w-full h-10 bg-white/5 border border-white/15 rounded-lg px-3 text-sm text-white"
          >
            <option value="" className="bg-[#0b0b12] text-white">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="bg-[#0b0b12] text-white">
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[160px]">
          <label className="text-xs text-gray-400 block mb-1">Created on</label>
          <input
            type="date"
            name="date"
            defaultValue={dateFilter}
            className="w-full h-10 bg-white/5 border border-white/15 rounded-lg px-3 text-sm text-white [color-scheme:dark]"
          />
        </div>

        <div className="flex gap-2">
          <button type="submit" className="h-10 bg-brand-gradient text-white text-sm font-semibold px-4 rounded-lg">
            Filter
          </button>
          {hasActiveFilters && (
            <Link
              href="/dashboard"
              className="h-10 flex items-center text-sm font-semibold px-4 rounded-lg border border-white/15 text-gray-300 hover:bg-white/5"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-gray-400 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Lead</th>
              <th className="text-left px-4 py-3">Phone</th>
              {isAdmin && <th className="text-left px-4 py-3">Counsellor</th>}
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Score</th>
              <th className="text-left px-4 py-3">Recommendation</th>
              <th className="text-left px-4 py-3">Created</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(assessments ?? []).map((a: any) => (
              <tr key={a.id} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/report/${a.id}`} className="font-medium text-brand-pink">
                    {a.leads?.name ?? "—"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-300">{a.leads?.phone ?? "—"}</td>
                {isAdmin && <td className="px-4 py-3 text-gray-300">{a.leads?.counsellors?.name ?? "—"}</td>}
                <td className="px-4 py-3">
                  {statusBadge(a.status)}
                  {a.status !== "complete" && a.status !== "processing" && (
                    <span className="ml-1.5 text-xs text-gray-500">
                      ({Math.round(((a.current_step ?? 1) / TOTAL_STEPS) * 100)}%)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-white">{a.overall_score ?? "—"}</td>
                <td className="px-4 py-3 text-gray-300">{a.recommended_course ?? "—"}</td>
                <td className="px-4 py-3 text-gray-400">{new Date(a.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {a.leads?.id && <DeleteLeadButton leadId={a.leads.id} leadName={a.leads.name ?? "this lead"} />}
                </td>
              </tr>
            ))}
            {(!assessments || assessments.length === 0) && (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="px-4 py-8 text-center text-gray-500">
                  {hasActiveFilters ? "No assessments match these filters." : "No assessments yet. Create your first link."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
