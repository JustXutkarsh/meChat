import { createClient } from "@supabase/supabase-js";
import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function useSupabaseClient() {
  const { getToken } = useAuth();
  const url = supabaseUrl || "http://127.0.0.1:54321";
  const anon = supabaseAnonKey || "missing-anon-key";

  return useMemo(
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
}
