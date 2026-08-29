"use client";

import { supabaseBrowser } from "@/lib/supabase/client";

export default function SignOutButton() {
  return (
    <button
      className="text-xs text-gray-400 hover:text-white underline"
      onClick={async () => {
        const supabase = supabaseBrowser();
        await supabase.auth.signOut();
        window.location.href = "/login";
      }}
    >
      Sign out
    </button>
  );
}
