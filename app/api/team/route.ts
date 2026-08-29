import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentCounsellor } from "@/lib/auth";

async function requireAdmin() {
  const counsellor = await getCurrentCounsellor();
  if (!counsellor || counsellor.role !== "admin") return null;
  return counsellor;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const db = supabaseAdmin();
  const { data, error } = await db.from("counsellors").select("id, name, email, role").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { name, email, role } = await req.json();
  if (!name || !email || !role) {
    return NextResponse.json({ error: "Name, email, and role are required" }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: invited, error: inviteErr } = await db.auth.admin.inviteUserByEmail(email);
  if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 });

  const { error: insertErr } = await db.from("counsellors").insert({
    auth_id: invited.user.id,
    email,
    name,
    role,
    is_admin: role === "admin"
  });
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { id, role } = await req.json();
  if (!id || !role) return NextResponse.json({ error: "id and role are required" }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db
    .from("counsellors")
    .update({ role, is_admin: role === "admin" })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
