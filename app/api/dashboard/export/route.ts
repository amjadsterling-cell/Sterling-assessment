import { NextRequest, NextResponse } from "next/server";
import { getCurrentCounsellor } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Exports the current dashboard list (respecting whatever filters are
// active) as a downloadable CSV. Same visibility rules as the dashboard
// itself: admins see everyone, counsellors/trainers only see their own.
export async function GET(request: NextRequest) {
  const counsellor = await getCurrentCounsellor();
  if (!counsellor) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const isAdmin = counsellor.role === "admin";

  const { searchParams } = new URL(request.url);
  const counsellorFilter = searchParams.get("counsellor") ?? "";
  const statusFilter = searchParams.get("status") ?? "";
  const dateFilter = searchParams.get("date") ?? "";
  const q = (searchParams.get("q") ?? "").trim();

  let query = db
    .from("assessments")
    .select(
      "status, overall_score, recommended_course, created_at, leads(name, phone, counsellor_id, counsellors(name))"
    )
    .order("created_at", { ascending: false })
    .limit(2000);

  const needsLeadRestriction = !isAdmin || counsellorFilter || q;
  if (needsLeadRestriction) {
    let leadQuery = db.from("leads").select("id");
    if (!isAdmin) {
      leadQuery = leadQuery.eq("counsellor_id", counsellor.id);
    } else if (counsellorFilter) {
      leadQuery = leadQuery.eq("counsellor_id", counsellorFilter);
    }
    if (q) {
      leadQuery = leadQuery.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
    }
    const { data: leads } = await leadQuery;
    const ids = (leads ?? []).map((l) => l.id);
    query = query.in("lead_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }

  if (statusFilter) query = query.eq("status", statusFilter);
  if (dateFilter) {
    query = query.gte("created_at", `${dateFilter}T00:00:00.000Z`).lte("created_at", `${dateFilter}T23:59:59.999Z`);
  }

  const { data: assessments } = await query;

  const header = ["Lead", "Phone", "Counsellor", "Status", "Score", "Recommendation", "Created"];
  function csvCell(value: unknown) {
    const s = value === null || value === undefined ? "" : String(value);
    return `"${s.replace(/"/g, '""')}"`;
  }

  const rows = (assessments ?? []).map((a: any) => [
    a.leads?.name ?? "",
    a.leads?.phone ?? "",
    a.leads?.counsellors?.name ?? "",
    a.status ?? "",
    a.overall_score ?? "",
    a.recommended_course ?? "",
    new Date(a.created_at).toLocaleDateString()
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="assessments-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });
}
