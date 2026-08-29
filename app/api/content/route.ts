import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentCounsellor } from "@/lib/auth";

export async function GET() {
  const counsellor = await getCurrentCounsellor();
  if (!counsellor || counsellor.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("content_versions")
    .select("version, content")
    .eq("is_active", true)
    .single();

  if (error || !data) return NextResponse.json({ error: "No active content version" }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const counsellor = await getCurrentCounsellor();
  if (!counsellor || counsellor.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { content } = await req.json();
  if (!content || typeof content !== "object") {
    return NextResponse.json({ error: "Invalid content payload" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Preserve reproducibility: never edit an existing version in place. Old
  // assessments keep pointing at the version they were taken with.
  const { data: current } = await db
    .from("content_versions")
    .select("version")
    .eq("is_active", true)
    .single();

  const nextVersion = (current?.version ?? 0) + 1;

  const { error: deactivateErr } = await db
    .from("content_versions")
    .update({ is_active: false })
    .eq("is_active", true);
  if (deactivateErr) return NextResponse.json({ error: deactivateErr.message }, { status: 500 });

  const { error: insertErr } = await db
    .from("content_versions")
    .insert({ version: nextVersion, is_active: true, content });
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  return NextResponse.json({ version: nextVersion });
}
