import Link from "next/link";
import { getCurrentCounsellor } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="relative bg-[#161310] border border-[#221d15] rounded-xl p-4 overflow-hidden">
      <div
        className="absolute top-0 left-3 right-3 h-[3px] rounded-full"
        style={{ background: "linear-gradient(120deg,#ed1f51,#f05825)" }}
      />
      <p className="text-xs text-[#9a9282] label uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-heading font-bold mt-1 text-[#f2ede1]">{value}</p>
    </div>
  );
}

const STATUS_OPTIONS = ["sent", "started", "recording", "processing", "complete", "insufficient_sample", "failed"];

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    sent: "bg-[#201c15] text-[#9a9282]",
    started: "bg-[#35270f] text-[#e3a94a]",
    recording: "bg-[#35270f] text-[#e3a94a]",
    processing: "bg-[#0f2333] text-[#6fb4e0]",
    complete: "bg-[#17331f] text-[#7fd394]",
    insufficient_sample: "bg-[#35270f] text-[#e3a94a]",
    failed: "bg-[#331515] text-[#e07f7f]"
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-[#201c15] text-[#9a9282]"}`}>
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

  const isAdmin = counsellor?.role === "admin";

  const counsellorFilter = searchParams.counsellor ?? "";
  const statusFilter = searchParams.status ?? "";
  const dateFilter = searchParams.date ?? "";
  const q = (searchParams.q ?? "").trim();

  let counsellorOptions: { id: string; name: string }[] = [];
  if (isAdmin) {
    const { data } = await db.from("counsellors").select("id, name").order("name");
    counsellorOptions = data ?? [];
  }

  let query = db
    .from("assessments")
    .select("id, status, overall_score, recommended_course, created_at, completed_at, leads(id, name, phone, counsellor_id, counsellors(name))")
    .order("created_at", { ascending: false })
    .limit(200);

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
        <h1 className="text-xl font-bold text-[#f2ede1]">Dashboard</h1>
        <Link href="/dashboard/new" className="bg-brand-gradient text-brand-black text-sm font-bold px-4 py-2 rounded-lg">
          + New assessment
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Sent" value={sentCount} />
        <StatCard label="In progress" value={inProgress} />
        <StatCard label="Completed today" value={completedToday} />
        <StatCard label="Conversion" value={`${conversion}%`} />
      </div>

      <form method="get" className="bg-[#0d0b08] border border-[#221d15] rounded-full p-1.5 mb-4 flex flex-wrap items-center gap-1.5">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b6459]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search here"
            className="h-7 w-36 bg-[#161310] border border-[#2a2419] rounded-full pl-7 pr-2.5 text-xs text-[#f2ede1] placeholder:text-[#6b6459]"
          />
        </div>

        {isAdmin && (
          <select
            name="counsellor"
            defaultValue={counsellorFilter}
            className="h-7 bg-[#161310] border border-[#2a2419] rounded-full px-2.5 text-xs text-[#f2ede1]"
          >
            <option value="">All counsellors</option>
            {counsellorOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        <select
          name="status"
          defaultValue={statusFilter}
          className="h-7 bg-[#161310] border border-[#2a2419] rounded-full px-2.5 text-xs text-[#f2ede1]"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>

        <input
          type="date"
          name="date"
          defaultValue={dateFilter}
          className="h-7 bg-[#161310] border border-[#2a2419] rounded-full px-2.5 text-xs text-[#f2ede1]"
        />

        <button type="submit" className="h-7 bg-brand-gradient text-brand-black text-xs font-bold px-3 rounded-full">
          Filter
        </button>
        {hasActiveFilters && (
          <Link
            href="/dashboard"
            className="h-7 flex items-center text-xs font-semibold px-3 rounded-full border border-[#2a2419] text-[#9a9282]"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="bg-[#0d0b08] border border-[#221d15] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#161310] text-[#7d7568] text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Lead</th>
              <th className="text-left px-4 py-3">Phone</th>
              {isAdmin && <th className="text-left px-4 py-3">Counsellor</th>}
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Score</th>
              <th className="text-left px-4 py-3">Recommendation</th>
              <th className="text-left px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {(assessments ?? []).map((a: any) => (
              <tr key={a.id} className="border-t border-[#1c1712] hover:bg-[#161310]">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/report/${a.id}`} className="font-semibold text-brand-gold">
                    {a.leads?.name ?? "—"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[#b8b2a4]">{a.leads?.phone ?? "—"}</td>
                {isAdmin && <td className="px-4 py-3 text-[#b8b2a4]">{a.leads?.counsellors?.name ?? "—"}</td>}
                <td className="px-4 py-3">{statusBadge(a.status)}</td>
                <td className="px-4 py-3 text-[#d9d3c4]">{a.overall_score ?? "—"}</td>
                <td className="px-4 py-3 text-[#d9d3c4]">{a.recommended_course ?? "—"}</td>
                <td className="px-4 py-3 text-[#7d7568]">{new Date(a.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {(!assessments || assessments.length === 0) && (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-[#7d7568]">
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
