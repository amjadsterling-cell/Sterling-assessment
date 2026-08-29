import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCounsellor } from "@/lib/auth";
import SignOutButton from "./sign-out-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const counsellor = await getCurrentCounsellor();
  if (!counsellor) redirect("/login");

  const isAdmin = counsellor.role === "admin";
  const isTrainer = counsellor.role === "trainer";

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 shrink-0 bg-brand-black text-white flex flex-col">
        <div className="p-5">
          <div className="w-full h-1.5 rounded-full bg-brand-gradient mb-4" />
          <p className="font-heading font-bold text-sm leading-tight">Spoken English</p>
          <p className="text-xs text-gray-400">Assessment console</p>
        </div>
        <nav className="flex-1 px-3 space-y-1 text-sm">
          <Link href="/dashboard" className="block px-3 py-2 rounded-lg hover:bg-white/10">
            Dashboard
          </Link>
          <Link href="/dashboard/new" className="block px-3 py-2 rounded-lg hover:bg-white/10">
            New assessment
          </Link>
          {(isAdmin || isTrainer) && (
            <p className="px-3 pt-3 text-[11px] uppercase tracking-wide text-gray-500">
              Admin / trainer
            </p>
          )}
          {isAdmin && (
            <>
              <Link href="/dashboard/content" className="block px-3 py-2 rounded-lg hover:bg-white/10">
                Edit questions
              </Link>
              <Link href="/dashboard/team" className="block px-3 py-2 rounded-lg hover:bg-white/10">
                Team
              </Link>
            </>
          )}
        </nav>
        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-gray-400 mb-2">
            {counsellor.name} · {counsellor.role}
          </p>
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 bg-gray-50 min-h-screen p-6">{children}</main>
    </div>
  );
}
