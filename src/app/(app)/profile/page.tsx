"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SignOutButton, useUser } from "@clerk/nextjs";
import { Avatar } from "@/components/avatar";
import { AppShell } from "@/components/ui/app-shell";
import { GradientLogo } from "@/components/ui/gradient-logo";
import { useSupabaseClient } from "@/lib/supabase";

export default function ProfilePage() {
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const [age, setAge] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("age, username").eq("id", user.id).maybeSingle();
      setAge(data?.age ?? null);
      setUsername(data?.username ?? null);
    };

    void run();
  }, [user, supabase]);

  return (
    <AppShell>
      <main className="min-h-dvh p-4">
        <div className="mb-4 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Link href="/chats">← Back</Link>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
          <div className="mb-4 flex items-center gap-3">
            <GradientLogo size="sm" />
            <p className="text-sm text-[var(--text-secondary)]">Your profile</p>
          </div>

          <div className="flex items-center gap-3">
            <Avatar name={user?.fullName || "User"} imageUrl={user?.imageUrl} />
            <div>
              <h1 className="text-lg font-semibold">{user?.fullName || "User"}</h1>
              <p className="text-xs text-[var(--text-secondary)]">@{username || "set-username"}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
            <p className="text-[var(--text-secondary)]">Age: <span className="text-[var(--text-primary)]">{age ?? "-"}</span></p>
            <p className="text-[var(--text-secondary)]">Email: <span className="text-[var(--text-primary)]">{user?.primaryEmailAddress?.emailAddress || "No email"}</span></p>
            <p className="text-[var(--text-secondary)]">Phone: <span className="text-[var(--text-primary)]">{user?.primaryPhoneNumber?.phoneNumber || "No phone"}</span></p>
          </div>

          <div className="mt-5">
            <SignOutButton>
              <button className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/20">
                Logout
              </button>
            </SignOutButton>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
