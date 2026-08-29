"use client";

import { useState } from "react";

export default function NewAssessmentPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create assessment");
      setLink(data.url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-bold mb-4">New assessment</h1>

      {!link ? (
        <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 space-y-4">
          <div>
            <label className="text-sm text-gray-700">Lead name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-gray-700">Phone (WhatsApp)</label>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="+91..."
            />
          </div>
          <div>
            <label className="text-sm text-gray-700">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-brand-pink">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-gradient text-white font-semibold rounded-lg py-2.5 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create link"}
          </button>
        </form>
      ) : (
        <div className="bg-white border rounded-xl p-6 space-y-4">
          <p className="text-sm text-gray-600">Send this link to {name} on WhatsApp:</p>
          <div className="flex gap-2">
            <input readOnly value={link} className="flex-1 border rounded-lg px-3 py-2 text-sm bg-gray-50" />
            <button
              onClick={() => navigator.clipboard.writeText(link)}
              className="px-3 py-2 rounded-lg bg-brand-black text-white text-sm"
            >
              Copy
            </button>
          </div>
          <a
            href={`https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
              `Hi ${name}, please complete your spoken English assessment here: ${link}`
            )}`}
            target="_blank"
            className="block text-center bg-green-600 text-white rounded-lg py-2.5 font-semibold text-sm"
          >
            Open in WhatsApp
          </a>
          <button
            onClick={() => {
              setLink(null);
              setName("");
              setPhone("");
              setEmail("");
            }}
            className="text-xs text-gray-500 underline"
          >
            Create another
          </button>
        </div>
      )}
    </div>
  );
}
