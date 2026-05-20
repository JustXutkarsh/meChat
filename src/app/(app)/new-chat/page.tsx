"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { AppShell } from "@/components/ui/app-shell";
import { ContactListItem } from "@/components/ui/contact-list-item";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBar } from "@/components/ui/search-bar";
import { SkeletonChatItem } from "@/components/ui/skeleton-chat-item";
import {
  acceptFriendRequest,
  getOrCreateConversation,
  searchUsers,
  sendFriendRequest,
} from "@/lib/chat";
import { useSupabaseClient } from "@/lib/supabase";
import type { SearchUserItem } from "@/lib/types";

export default function NewChatPage() {
  const { user } = useUser();
  const router = useRouter();
  const supabase = useSupabaseClient();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (search: string) => {
    if (!user) return;
    setResults(await searchUsers(supabase, user.id, search));
  }, [supabase, user]);

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      try {
        setLoading(true);
        await refresh(query);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load users.");
      } finally {
        setLoading(false);
      }
    };

    const t = setTimeout(() => void run(), 200);
    return () => clearTimeout(t);
  }, [query, refresh, user]);

  const handleAdd = async (otherUserId: string) => {
    if (!user) return;
    try {
      setError(null);
      await sendFriendRequest(
        supabase,
        user.id,
        otherUserId,
        user.fullName || user.username || "Someone"
      );
      await refresh(query);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send request.");
    }
  };

  const handleAccept = async (requestId: string) => {
    if (!user) return;
    try {
      setError(null);
      const conversationId = await acceptFriendRequest(
        supabase,
        requestId,
        user.id,
        user.fullName || user.username || "Your friend"
      );
      router.push(`/chats/${conversationId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not accept request.");
    }
  };

  const handleMessage = async (otherUserId: string) => {
    if (!user) return;
    try {
      setError(null);
      const id = await getOrCreateConversation(supabase, user.id, otherUserId);
      router.push(`/chats/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open conversation.");
    }
  };

  return (
    <AppShell>
      <main className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-20 h-16 border-b border-[var(--border)] bg-[var(--surface)] px-4">
          <div className="flex h-full items-center gap-3"><Link href="/chats" className="text-[var(--text-secondary)]">←</Link><h1 className="text-lg font-semibold">New chat</h1></div>
        </header>

        <div className="px-3 py-2"><SearchBar value={query} onChange={setQuery} placeholder="Search username" /></div>
        {error ? <div className="mx-3 rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">{error}</div> : null}

        <section className="flex-1 overflow-y-auto px-1 pb-3">
          {loading ? (
            <>
              <SkeletonChatItem />
              <SkeletonChatItem />
            </>
          ) : results.length === 0 ? (
            <EmptyState title="No users found" description="Try a different username." />
          ) : (
            results.map((item) => (
              <ContactListItem
                key={item.profile.id}
                item={item}
                onAdd={() => void handleAdd(item.profile.id)}
                onAccept={() => item.request?.id ? void handleAccept(item.request.id) : undefined}
                onMessage={() => void handleMessage(item.profile.id)}
              />
            ))
          )}
        </section>
      </main>
    </AppShell>
  );
}
