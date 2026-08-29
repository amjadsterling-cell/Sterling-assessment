import { supabaseServer } from "./supabase/server";
import { supabaseAdmin } from "./supabase/admin";

export type Counsellor = {
  id: string;
  auth_id: string;
  email: string;
  name: string;
  is_admin: boolean;
  role: "admin" | "counsellor" | "trainer";
};

/**
 * Returns the logged-in counsellor row for the current request, resolving
 * role from the `counsellors` table. If no counsellor row exists yet for this
 * auth user, one is created. If no admin exists anywhere in the system yet,
 * this user is promoted to admin automatically (anti-lockout on first login).
 * Returns null if nobody is logged in.
 */
export async function getCurrentCounsellor(): Promise<Counsellor | null> {
  const auth = supabaseServer();
  const {
    data: { user }
  } = await auth.auth.getUser();
  if (!user) return null;

  const db = supabaseAdmin();

  const { data: existing } = await db
    .from("counsellors")
    .select("*")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (existing) return existing as Counsellor;

  const { count } = await db
    .from("counsellors")
    .select("*", { count: "exact", head: true });

  const isFirstUser = (count ?? 0) === 0;

  const { data: created, error } = await db
    .from("counsellors")
    .insert({
      auth_id: user.id,
      email: user.email,
      name: user.email?.split("@")[0] ?? "New user",
      is_admin: isFirstUser,
      role: isFirstUser ? "admin" : "counsellor"
    })
    .select("*")
    .single();

  if (error) throw error;
  return created as Counsellor;
}
