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
      <h1 className="text-xl font-bold mb-4">Team</h1>

      <form onSubmit={handleInvite} className="bg-white border rounded-xl p-5 space-y-3 mb-6">
        <p className="text-sm font-semibold">Invite a team member</p>
        <div className="flex gap-3">
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
          />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="counsellor">Counsellor</option>
            <option value="trainer">Trainer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button className="bg-brand-gradient text-white text-sm font-semibold px-4 py-2 rounded-lg">Invite</button>
        {status && <p className="text-sm text-gray-600">{status}</p>}
      </form>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="px-4 py-3">{m.name}</td>
                <td className="px-4 py-3 text-gray-600">{m.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={m.role}
                    onChange={(e) => updateRole(m.id, e.target.value)}
                    className="border rounded-lg px-2 py-1 text-xs"
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
