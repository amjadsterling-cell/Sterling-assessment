"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function DashboardIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function NewAssessmentIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="16" y1="11" x2="22" y2="11" />
    </svg>
  );
}

function ContentIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function NavLink({
  href,
  icon,
  children,
  exact = false
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm relative transition-colors ${
        isActive ? "bg-white/10 text-[#f2ede1] font-semibold" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
      }`}
    >
      {isActive && (
        <span
          className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full"
          style={{ background: "linear-gradient(180deg,#f6dc9a,#c9942f)" }}
        />
      )}
      <span className={isActive ? "text-brand-gold" : "text-gray-500"}>{icon}</span>
      {children}
    </Link>
  );
}

export default function SidebarNav({ isAdmin, isTrainer }: { isAdmin: boolean; isTrainer: boolean }) {
  return (
    <nav className="flex-1 px-3 space-y-1 text-sm">
      <NavLink href="/dashboard" icon={<DashboardIcon />} exact>
        Dashboard
      </NavLink>
      <NavLink href="/dashboard/new" icon={<NewAssessmentIcon />}>
        New assessment
      </NavLink>
      {(isAdmin || isTrainer) && (
        <p className="px-3 pt-3 text-[11px] uppercase tracking-wide text-gray-500">Admin / trainer</p>
      )}
      {isAdmin && (
        <>
          <NavLink href="/dashboard/content" icon={<ContentIcon />}>
            Edit questions
          </NavLink>
          <NavLink href="/dashboard/team" icon={<TeamIcon />}>
            Team
          </NavLink>
        </>
      )}
    </nav>
  );
}
