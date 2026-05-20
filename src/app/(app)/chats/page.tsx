"use client";

import { formatDistanceToNow } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { AppShell } from "@/components/ui/app-shell";
import { Avatar } from "@/components/avatar";
import { ChatListHeader } from "@/components/ui/chat-list-header";
import { ChatListItem } from "@/components/ui/chat-list-item";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBar } from "@/components/ui/search-bar";
import { SkeletonChatItem } from "@/components/ui/skeleton-chat-item";
import {
  acceptFriendRequest,
  fetchNotifications,
  getChatList,
  markNotificationsRead,
  rejectFriendRequest,
} from "@/lib/chat";
import { useSupabaseClient } from "@/lib/supabase";
import type { ChatListItem as TChatListItem, NotificationItem, Profile } from "@/lib/types";

export default function ChatsPage() {
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const router = useRouter();

  const [chats, setChats] = useState<TChatListItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [actorProfiles, setActorProfiles] = useState<Record<string, Profile>>({});
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [bellWiggle, setBellWiggle] = useState(false);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );

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

    async function loadNotifications() {
      try {
        const items = await fetchNotifications(supabase, userId);
        if (!isMounted) return;
        setNotifications(items);

        const actorIds = [...new Set(items.map((item) => item.actor_id))];
        if (!actorIds.length) return;

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, username, age, email, phone, avatar_url")
          .in("id", actorIds);

        if (!profiles || !isMounted) return;
        const mapped = Object.fromEntries((profiles as Profile[]).map((profile) => [profile.id, profile]));
        setActorProfiles(mapped);
      } catch {
        // keep notification state stable
      }
    }

    void loadChats(false);
    void loadNotifications();

    return () => {
      isMounted = false;
    };
  }, [supabase, user?.id, user]);

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;

    const conversationsChannel = supabase
      .channel(`chat-list:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, async () => {
        try {
          const data = await getChatList(supabase, userId);
          setChats(data || []);
          setHasLoadedOnce(true);
        } catch {
          // keep state stable
        }
      })
      .subscribe();

    const messagesChannel = supabase
      .channel(`chat-list-messages:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        const incoming = payload.new as { id: string; conversation_id: string; sender_id: string; content: string; created_at: string };
        setChats((prev) => {
          const index = prev.findIndex((chat) => chat.conversationId === incoming.conversation_id);
          if (index === -1) return prev;
          const existing = prev[index];
          const updated = {
            ...existing,
            lastMessage: incoming.content,
            lastMessageAt: incoming.created_at,
            lastMessageSenderId: incoming.sender_id,
            unreadCount: incoming.sender_id === userId ? existing.unreadCount : existing.unreadCount + 1,
          };
          const next = [...prev];
          next.splice(index, 1);
          return [updated, ...next];
        });
      })
      .subscribe();

    const notificationsChannel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const incoming = payload.new as NotificationItem;
          setNotifications((prev) => [incoming, ...prev]);
          setBellWiggle(true);
          setTimeout(() => setBellWiggle(false), 700);
          void (async () => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("id, full_name, username, age, email, phone, avatar_url")
              .eq("id", incoming.actor_id)
              .maybeSingle();
            if (profile) {
              setActorProfiles((prev) => ({ ...prev, [incoming.actor_id]: profile as Profile }));
            }
          })();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(conversationsChannel);
      void supabase.removeChannel(messagesChannel);
      void supabase.removeChannel(notificationsChannel);
    };
  }, [supabase, user?.id, user]);

  async function handleOpenNotifications() {
    setIsNotificationsOpen((prev) => !prev);
    if (!isNotificationsOpen && user?.id) {
      void markNotificationsRead(supabase, user.id);
      setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })));
    }
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return chats;
    return chats.filter((chat) =>
      `${chat.otherUser.full_name ?? ""} ${chat.otherUser.username ?? ""} ${chat.lastMessage ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [chats, query]);

  async function handleAccept(notification: NotificationItem) {
    if (!user?.id) return;
    const requestId = String(notification.metadata?.request_id ?? "");
    if (!requestId) return;

    try {
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
  }

  async function handleReject(notification: NotificationItem) {
    if (!user?.id) return;
    const requestId = String(notification.metadata?.request_id ?? "");
    if (!requestId) return;

    try {
      await rejectFriendRequest(supabase, requestId, user.id);
      setNotifications((prev) => prev.filter((item) => item.id !== notification.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reject request.");
    }
  }

  return (
    <AppShell>
      <main className="flex min-h-dvh flex-col">
        <ChatListHeader />

        <div className="flex items-center gap-2 px-3 py-2">
          <div className="flex-1">
            <SearchBar value={query} onChange={setQuery} placeholder="Search people, vibes, chats..." />
          </div>
          <button
            onClick={() => void handleOpenNotifications()}
            className={`relative grid h-11 w-11 place-items-center rounded-full border border-[var(--border)] bg-[rgba(15,23,42,0.72)] text-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition active:scale-95 ${bellWiggle ? "[animation:bell-wiggle_0.6s_ease]" : ""}`}
            aria-label="Notifications"
          >
            🔔
            {unreadNotificationCount > 0 ? (
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[linear-gradient(135deg,#8B5CF6,#EC4899)] px-1 text-[10px] font-semibold text-white shadow-[0_0_16px_rgba(236,72,153,0.4)] [animation:pulse-soft_1.6s_ease-in-out_infinite]">
                {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
              </span>
            ) : null}
          </button>
        </div>

        {error ? <div className="mx-3 rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">{error}</div> : null}

        <section className="flex-1 overflow-y-auto px-1 pb-3">
          {isLoading && !hasLoadedOnce ? (
            <>
              <SkeletonChatItem />
              <SkeletonChatItem />
              <SkeletonChatItem />
            </>
          ) : hasLoadedOnce && filtered.length === 0 ? (
            <EmptyState title="No chaos yet" description="Start a chat and make this place less lonely." actionHref="/new-chat" actionLabel="Start a vibe" />
          ) : (
            filtered.map((chat) => <ChatListItem key={chat.conversationId} chat={chat} currentUserId={user?.id ?? ""} />)
          )}
        </section>

        {isNotificationsOpen ? (
          <div className="absolute inset-0 z-50 bg-black/45" onClick={() => setIsNotificationsOpen(false)}>
            <div className="absolute bottom-0 left-0 right-0 max-h-[70dvh] overflow-y-auto rounded-t-3xl border-t border-[var(--border)] bg-[rgba(11,17,32,0.86)] p-3 backdrop-blur-2xl animate-enter" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-3 text-lg font-semibold">Notifications</h2>
              {notifications.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">No notifications yet.</p>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => {
                    const actor = actorProfiles[notification.actor_id];
                    return (
                      <div key={notification.id} className="rounded-2xl border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-3">
                        <div className="flex items-start gap-2">
                          <Avatar
                            name={actor?.full_name || actor?.username || "Someone"}
                            imageUrl={actor?.avatar_url || null}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">{notification.title}</p>
                            <p className="text-xs text-[var(--text-secondary)]">{notification.body}</p>
                            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                              {actor?.full_name || actor?.username || "Someone"} · {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        {notification.type === "friend_request" ? (
                          <div className="mt-2 flex items-center gap-2">
                            <button onClick={() => void handleAccept(notification)} className="rounded-full bg-[var(--whatsapp-green)] px-3 py-1 text-xs font-semibold text-white">Accept</button>
                            <button onClick={() => void handleReject(notification)} className="rounded-full border border-red-400/60 px-3 py-1 text-xs text-red-300">Reject</button>
                          </div>
                        ) : null}
                        {notification.type === "friend_request_accepted" ? (
                          <button
                            onClick={() => {
                              const conversationId = String(notification.metadata?.conversation_id ?? "");
                              if (conversationId) router.push(`/chats/${conversationId}`);
                            }}
                            className="mt-2 rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-white"
                          >
                            Message
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </AppShell>
  );
}
