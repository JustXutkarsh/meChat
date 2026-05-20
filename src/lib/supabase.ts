import { createClient } from "@supabase/supabase-js";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo } from "react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function useSupabaseClient() {
  const { getToken, userId } = useAuth();
  const url = supabaseUrl || "http://127.0.0.1:54321";
  const anon = supabaseAnonKey || "missing-anon-key";

  const client = useMemo(
    () =>
      createClient(url, anon, {
        global: {
          fetch: async (url, options = {}) => {
            const token = await getToken({ template: "supabase" });
            const headers = new Headers(options.headers);
            if (token) headers.set("Authorization", `Bearer ${token}`);
            return fetch(url, { ...options, headers });
          },
        },
      }),
    [anon, getToken, url],
  );

  useEffect(() => {
    let active = true;
    const applyRealtimeAuth = async () => {
      const token = await getToken({ template: "supabase" });
      if (!active || !token) return;
      await client.realtime.setAuth(token);
    };
    void applyRealtimeAuth();
    return () => {
      active = false;
    };
  }, [client, getToken, userId]);

  return client;
}
