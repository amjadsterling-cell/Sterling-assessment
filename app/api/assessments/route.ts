import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentCounsellor } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const counsellor = await getCurrentCounsellor();
  if (!counsellor) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { name, phone, email } = await req.json();
  if (!name || !phone) {
    return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: activeVersion, error: versionErr } = await db
    .from("content_versions")
    .select("id, content")
    .eq("is_active", true)
    .single();

  if (versionErr || !activeVersion) {
    return NextResponse.json({ error: "No active content version configured" }, { status: 500 });
  }

  const { data: lead, error: leadErr } = await db
    .from("leads")
    .insert({ name, phone, email: email || null, counsellor_id: counsellor.id })
    .select("id")
    .single();

  if (leadErr) return NextResponse.json({ error: leadErr.message }, { status: 500 });

  const passages = activeVersion.content?.passages ?? [];
  const passage = passages[Math.floor(Math.random() * Math.max(passages.length, 1))];

  const token = randomUUID().replace(/-/g, "").slice(0, 16);

  const { error: assessmentErr } = await db.from("assessments").insert({
    lead_id: lead.id,
    token,
    content_version_id: activeVersion.id,
    passage_id: passage?.id ?? null,
    status: "sent"
  });

  if (assessmentErr) return NextResponse.json({ error: assessmentErr.message }, { status: 500 });

  const base = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  return NextResponse.json({ url: `${base}/a/${token}` });
}
