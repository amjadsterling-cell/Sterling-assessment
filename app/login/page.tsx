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
    <div className="min-h-screen flex items-center justify-center bg-brand-black px-4">
      <div className="w-full max-w-sm bg-[#0d0b08] border border-[#221d15] rounded-2xl shadow-md p-8 text-center">
        <img src="/logo.png" alt="Sterling Study Abroad" className="w-20 h-20 object-contain mx-auto mb-1" />
        <h1 className="font-heading text-2xl bg-brand-gradient bg-clip-text text-transparent mb-0.5">Sterling</h1>
        <p className="text-[10px] tracking-[3px] text-brand-gold/70 mb-3">STUDY ABROAD</p>
        <p className="text-sm text-gray-400 mb-6">Counsellor sign in</p>
        <form onSubmit={mode === "password" ? handlePasswordLogin : handleMagicLink} className="space-y-4 text-left">
          <div>
            <label className="text-sm text-gray-400">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-[#161310] border border-[#2a2419] rounded-lg px-3 py-2 text-sm text-white"
              placeholder="you@sterlingstudyabroad.com"
            />
          </div>
          {mode === "password" && (
            <div>
              <label className="text-sm text-gray-400">Password</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#161310] border border-[#2a2419] rounded-lg px-3 py-2 pr-16 text-sm text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-brand-gold/80 underline"
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
            className="w-full bg-brand-gradient text-brand-black font-bold rounded-lg py-2.5 disabled:opacity-60"
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
        {status && <p className="mt-4 text-sm text-red-500">{status}</p>}
      </div>
    </div>
  );
}
