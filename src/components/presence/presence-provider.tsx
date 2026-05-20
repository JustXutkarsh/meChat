"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useSupabaseClient } from "@/lib/supabase";
import type { PresenceRow } from "@/lib/presence";

type PresenceContextValue = {
  presenceMap: Record<string, PresenceRow>;
};

const PresenceContext = createContext<PresenceContextValue>({ presenceMap: {} });

export function usePresence() {
  return useContext(PresenceContext);
}

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const supabase = useSupabaseClient();
  const currentUserId = user?.id;
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceRow>>({});
  const heartbeatRef = useRef<number | null>(null);

  useEffect(() => {
    if (!currentUserId) return;

    const upsertOnline = async (online: boolean) => {
      const nowIso = new Date().toISOString();
      await supabase.from("user_presence").upsert(
        {
          user_id: currentUserId,
          is_online: online,
          last_seen: nowIso,
          updated_at: nowIso,
        },
        { onConflict: "user_id" }
      );
    };

    const setup = async () => {
      const token = await getToken({ template: "supabase" });
      if (token) await supabase.realtime.setAuth(token);
      await upsertOnline(true);

      heartbeatRef.current = window.setInterval(() => {
        if (document.visibilityState === "visible") {
          void upsertOnline(true);
        }
      }, 30_000);
    };

    const onVisibility = () => {
      void upsertOnline(document.visibilityState === "visible");
    };

    const onUnload = () => {
      void upsertOnline(false);
    };

    void setup();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onUnload);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onUnload);
      window.removeEventListener("beforeunload", onUnload);
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      void upsertOnline(false);
    };
  }, [currentUserId, getToken, supabase]);

  useEffect(() => {
    if (!currentUserId) return;

    // TODO: restrict presence visibility to accepted friends only.
    const channel = supabase
      .channel("presence:all")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, (payload) => {
        const row = (payload.new || payload.old) as PresenceRow;
        if (!row?.user_id) return;
        setPresenceMap((prev) => ({ ...prev, [row.user_id]: row }));
      })
      .subscribe();

    void (async () => {
      const { data } = await supabase
        .from("user_presence")
        .select("user_id, is_online, last_seen, updated_at")
        .limit(500);
      if (data?.length) {
        setPresenceMap(Object.fromEntries((data as PresenceRow[]).map((row) => [row.user_id, row])));
      }
    })();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, supabase]);

  const value = useMemo(() => ({ presenceMap }), [presenceMap]);
  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}
