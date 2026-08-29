"use client";

import { useEffect, useState } from "react";

export default function ContentEditorPage() {
  const [content, setContent] = useState<string>("");
  const [version, setVersion] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/content")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setStatus(data.error);
        } else {
          setContent(JSON.stringify(data.content, null, 2));
          setVersion(data.version);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setStatus(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      setStatus("That's not valid JSON — fix the syntax before saving.");
      return;
    }
    const res = await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: parsed })
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error ?? "Save failed");
    } else {
      setVersion(data.version);
      setStatus(`Saved as version ${data.version}. Existing reports stay tied to their original version.`);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Edit questions</h1>
        {version && <span className="text-xs text-gray-500">Active version: {version}</span>}
      </div>
      <p className="text-sm text-gray-500 mb-4">
        This JSON drives every question, the passage, and the course table shown to leads. Saving
        creates a new version — assessments already taken keep pointing at their original version, so
        old reports never change retroactively.
      </p>
      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : (
        <>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-[60vh] font-mono text-xs border rounded-lg p-4 bg-white"
            spellCheck={false}
          />
          <div className="flex items-center gap-3 mt-3">
            <button onClick={handleSave} className="bg-brand-gradient text-white text-sm font-semibold px-4 py-2 rounded-lg">
              Save new version
            </button>
            {status && <span className="text-sm text-gray-600">{status}</span>}
          </div>
        </>
      )}
    </div>
  );
}
