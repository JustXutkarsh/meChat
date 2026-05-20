"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useSupabaseClient } from "@/lib/supabase";
import { AppShell } from "@/components/ui/app-shell";
import { GradientLogo } from "@/components/ui/gradient-logo";
import { isUsernameAvailable, normalizeUsername, validateUsername } from "@/lib/chat";

export default function OnboardingPage() {
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const router = useRouter();

  const [fullName, setFullName] = useState(user?.fullName || user?.firstName || "");
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameHint, setUsernameHint] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const handleSave = async () => {
    if (!user) return;

    const normalizedUsername = username.trim().toLowerCase();
    const parsedAge = Number(age);

    if (!fullName.trim()) return setError("Name is required.");
    if (!normalizedUsername) return setError("Username is required.");
    const usernameError = validateUsername(normalizedUsername);
    if (usernameError) return setError(usernameError);
    if (!Number.isInteger(parsedAge) || parsedAge < 13 || parsedAge > 120) return setError("Enter a valid age.");

    try {
      setSaving(true);
      setError(null);
      const available = await isUsernameAvailable(supabase, normalizedUsername, user.id);
      if (!available) {
        setSaving(false);
        setError("Username is already taken.");
        return;
      }

      const profile = {
        id: user.id,
        full_name: fullName.trim(),
        username: normalizedUsername,
        age: parsedAge,
        email: user.primaryEmailAddress?.emailAddress || null,
        phone: user.primaryPhoneNumber?.phoneNumber || null,
        avatar_url: user.imageUrl || null,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase.from("profiles").upsert(profile, { onConflict: "id" });
      if (upsertError) throw upsertError;

      router.replace("/chats");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  const onUsernameChange = async (value: string) => {
    const normalized = normalizeUsername(value);
    setUsername(normalized);
    setUsernameHint(null);
    const usernameError = validateUsername(normalized);
    if (usernameError) {
      setUsernameHint(usernameError);
      return;
    }
    if (!user) return;
    try {
      setCheckingUsername(true);
      const available = await isUsernameAvailable(supabase, normalized, user.id);
      setUsernameHint(available ? "Username is available" : "Username is already taken");
    } finally {
      setCheckingUsername(false);
    }
  };

  return (
    <AppShell className="grid place-items-center px-4 py-8">
      <div className="w-full rounded-3xl border border-[var(--border)] bg-[linear-gradient(180deg,#111821,#0B0F14)] p-5">
        <div className="mb-4 flex items-center gap-3">
          <GradientLogo size="sm" />
          <div>
            <h1 className="text-lg font-bold">Create your profile</h1>
            <p className="text-xs text-[var(--text-secondary)]">Set name, age and username to start chatting.</p>
          </div>
        </div>

        <div className="space-y-3">
          <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-sm outline-none focus:border-[var(--primary-light)]" placeholder="Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-sm outline-none focus:border-[var(--primary-light)]" placeholder="Username" value={username} onChange={(e) => void onUsernameChange(e.target.value)} />
          {usernameHint ? <p className={`text-xs ${usernameHint.includes("available") ? "text-emerald-300" : "text-[var(--text-secondary)]"}`}>{checkingUsername ? "Checking..." : usernameHint}</p> : null}
          <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-sm outline-none focus:border-[var(--primary-light)]" placeholder="Age" type="number" value={age} onChange={(e) => setAge(e.target.value)} />
        </div>

        {error ? <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div> : null}

        <button onClick={handleSave} disabled={saving} className="mt-4 w-full rounded-xl bg-[linear-gradient(135deg,#7C3AED,#2563EB)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60">
          {saving ? "Saving..." : "Continue"}
        </button>
      </div>
    </AppShell>
  );
}
