"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useSupabaseClient } from "@/lib/supabase";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const supabase = useSupabaseClient();
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!isLoaded || !user) return;

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

      setChecking(false);
    };

    void run();
  }, [isLoaded, user, supabase, pathname, router]);

  if (!isLoaded || checking) {
    return <div className="grid min-h-screen place-items-center text-gray-600">Loading...</div>;
  }

  return <>{children}</>;
}
