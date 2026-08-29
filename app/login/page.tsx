"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setStatus(error.message);
    } else {
      window.location.href = "/dashboard";
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` }
    });
    setLoading(false);
    setStatus(error ? error.message : "Check your email for a login link.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
        <div className="w-full h-1.5 rounded-full bg-brand-gradient mb-6" />
        <h1 className="text-2xl font-bold mb-1">Counsellor login</h1>
        <p className="text-sm text-gray-500 mb-6">Spoken English Assessment</p>

        <form onSubmit={mode === "password" ? handlePasswordLogin : handleMagicLink} className="space-y-4">
          <div>
            <label className="text-sm text-gray-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="you@sterlingstudyabroad.com"
            />
          </div>

          {mode === "password" && (
            <div>
              <label className="text-sm text-gray-700">Password</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 pr-16 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 underline"
                  tabIndex={-1}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-gradient text-white font-semibold rounded-lg py-2.5 disabled:opacity-60"
          >
            {loading ? "Please wait..." : mode === "password" ? "Log in" : "Send magic link"}
          </button>
        </form>

        <button
          className="mt-4 text-xs text-gray-500 underline"
          onClick={() => setMode(mode === "password" ? "magic" : "password")}
        >
          {mode === "password" ? "Use a magic link instead" : "Use a password instead"}
        </button>

        <a href="/signup" className="mt-2 block text-xs text-gray-500 underline">
          Don&apos;t have an account? Sign up
        </a>

        {status && <p className="mt-4 text-sm text-brand-pink">{status}</p>}
      </div>
    </div>
  );
}
