"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    if (password !== confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setStatus("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const supabase = supabaseBrowser();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` }
    });
    setLoading(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    // If email confirmation is disabled in Supabase, a session is returned
    // immediately and we can go straight to the dashboard. Otherwise the
    // user needs to confirm via email first.
    if (data.session) {
      window.location.href = "/dashboard";
    } else {
      setStatus("Account created. Check your email to confirm before logging in.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
        <div className="w-full h-1.5 rounded-full bg-brand-gradient mb-6" />
        <h1 className="text-2xl font-bold mb-1">Create account</h1>
        <p className="text-sm text-gray-500 mb-6">Spoken English Assessment</p>

        <form onSubmit={handleSignup} className="space-y-4">
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

          <div>
            <label className="text-sm text-gray-700">Password</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 pr-16 text-sm"
                placeholder="At least 8 characters"
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

          <div>
            <label className="text-sm text-gray-700">Confirm password</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 pr-16 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-gradient text-white font-semibold rounded-lg py-2.5 disabled:opacity-60"
          >
            {loading ? "Please wait..." : "Sign up"}
          </button>
        </form>

        <a href="/login" className="mt-4 inline-block text-xs text-gray-500 underline">
          Already have an account? Log in
        </a>

        {status && <p className="mt-4 text-sm text-brand-pink">{status}</p>}
      </div>
    </div>
  );
}
