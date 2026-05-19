"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { AppShell } from "@/components/ui/app-shell";
import { ChatListHeader } from "@/components/ui/chat-list-header";
import { ChatListItem } from "@/components/ui/chat-list-item";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBar } from "@/components/ui/search-bar";
import { SkeletonChatItem } from "@/components/ui/skeleton-chat-item";
import { getChatList } from "@/lib/chat";
import { useSupabaseClient } from "@/lib/supabase";
import type { ChatListItem as TChatListItem } from "@/lib/types";

export default function ChatsPage() {
  const { user } = useUser();
  const supabase = useSupabaseClient();

  const [chats, setChats] = useState<TChatListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;

    let isMounted = true;

    async function loadChats(background = false) {
      if (!background && !hasLoadedOnceRef.current) setIsLoading(true);
      try {
        const data = await getChatList(supabase, userId);
        if (!isMounted) return;
        setChats(data || []);
        setHasLoadedOnce(true);
        hasLoadedOnceRef.current = true;
      } catch (e) {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : "Could not load chats.");
        setHasLoadedOnce(true);
        hasLoadedOnceRef.current = true;
      } finally {
        if (!isMounted) return;
        if (!background) setIsLoading(false);
      }
    }

    void loadChats(false);

    return () => {
      isMounted = false;
    };
  }, [supabase, user?.id, user]);

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;

    const channel = supabase
      .channel(`chat-list:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, async () => {
        try {
          const data = await getChatList(supabase, userId);
          setChats(data || []);
          setHasLoadedOnce(true);
        } catch {
          // keep current state stable
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, user?.id, user]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return chats;
    return chats.filter((chat) => `${chat.otherUser.full_name ?? ""} ${chat.otherUser.username ?? ""} ${chat.lastMessage ?? ""}`.toLowerCase().includes(q));
  }, [chats, query]);

  return (
    <AppShell>
      <main className="flex min-h-dvh flex-col">
        <ChatListHeader />
        <div className="px-3 py-2"><SearchBar value={query} onChange={setQuery} placeholder="Search chats" /></div>

        {error ? <div className="mx-3 rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">{error}</div> : null}

        <section className="flex-1 overflow-y-auto px-1 pb-3">
          {isLoading && !hasLoadedOnce ? (
            <>
              <SkeletonChatItem />
              <SkeletonChatItem />
              <SkeletonChatItem />
            </>
          ) : hasLoadedOnce && filtered.length === 0 ? (
            <EmptyState title="No chats yet" description="Start a new conversation." actionHref="/new-chat" actionLabel="Start chat" />
          ) : (
            filtered.map((chat) => <ChatListItem key={chat.conversationId} chat={chat} />)
          )}
        </section>
      </main>
    </AppShell>
  );
}
