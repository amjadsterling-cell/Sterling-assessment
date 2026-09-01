"use client";

import { useEffect, useState } from "react";

type Member = { id: string; name: string; email: string; role: string };

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("counsellor");
  const [status, setStatus] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/team");
    const data = await res.json();
    setMembers(data.members ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, role })
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error ?? "Could not invite");
    } else {
      setStatus(`Invited ${email}. They'll set a password via the magic-link email.`);
      setName("");
      setEmail("");
      load();
    }
  }

  async function updateRole(id: string, newRole: string) {
    await fetch("/api/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role: newRole })
    });
    load();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-[#f2ede1] mb-4">Team</h1>

      <form onSubmit={handleInvite} className="bg-[#0d0b08] border border-[#221d15] rounded-xl p-5 space-y-3 mb-6">
        <p className="text-sm font-semibold text-[#f2ede1]">Invite a team member</p>
        <div className="flex gap-3">
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="flex-1 bg-[#161310] border border-[#2a2419] rounded-lg px-3 py-2 text-sm text-[#f2ede1] placeholder:text-[#6b6459]"
          />
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 bg-[#161310] border border-[#2a2419] rounded-lg px-3 py-2 text-sm text-[#f2ede1] placeholder:text-[#6b6459]"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="bg-[#161310] border border-[#2a2419] rounded-lg px-3 py-2 text-sm text-[#f2ede1]"
          >
            <option value="counsellor">Counsellor</option>
            <option value="trainer">Trainer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button className="bg-brand-gradient text-brand-black text-sm font-bold px-4 py-2 rounded-lg">Invite</button>
        {status && <p className="text-sm text-[#9a9282]">{status}</p>}
      </form>

      <div className="bg-[#0d0b08] border border-[#221d15] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#161310] text-[#7d7568] text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t border-[#1c1712]">
                <td className="px-4 py-3 text-[#f2ede1]">{m.name}</td>
                <td className="px-4 py-3 text-[#b8b2a4]">{m.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={m.role}
                    onChange={(e) => updateRole(m.id, e.target.value)}
                    className="bg-[#161310] border border-[#2a2419] rounded-lg px-2 py-1 text-xs text-[#f2ede1]"
                  >
                    <option value="counsellor">Counsellor</option>
                    <option value="trainer">Trainer</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
