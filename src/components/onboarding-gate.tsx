"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { CallRuntimeProvider } from "@/components/calls/call-runtime-provider";
import { PresenceProvider } from "@/components/presence/presence-provider";
import { useSupabaseClient } from "@/lib/supabase";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const supabase = useSupabaseClient();
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!isLoaded) return;
      if (!user) {
        setChecking(false);
        router.replace("/sign-in");
        return;
      }

      try {
        const { data } = await supabase
          .from("profiles")
          .select("username, full_name, age")
          .eq("id", user.id)
          .maybeSingle();

        const completed = Boolean(data?.username && data?.full_name && data?.age);

        if (!completed && pathname !== "/onboarding") {
          router.replace("/onboarding");
        }

        if (completed && pathname === "/onboarding") {
          router.replace("/chats");
        }
      } catch {
        // If profile lookup fails (e.g. temporary API/token issue), keep app usable.
        if (pathname !== "/onboarding") {
          router.replace("/onboarding");
        }
      } finally {
        setChecking(false);
      }
    };

    void run();
  }, [isLoaded, user, supabase, pathname, router]);

  if (!isLoaded || checking) {
    return <div className="grid min-h-screen place-items-center text-gray-600">Loading...</div>;
  }

  return (
    <PresenceProvider>
      <CallRuntimeProvider>{children}</CallRuntimeProvider>
    </PresenceProvider>
  );
}
