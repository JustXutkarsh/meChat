"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { AppShell } from "@/components/ui/app-shell";
import { Avatar } from "@/components/avatar";
import { ChatHeader } from "@/components/ui/chat-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { MessageBubble } from "@/components/ui/message-bubble";
import { MessageInputBar } from "@/components/ui/message-input-bar";
import {
  blockUser,
  clearChatForUser,
  fetchMessagesAfterClear,
  getChatPermissionState,
  markMessagesRead,
  removeFriend,
  sendMessage,
} from "@/lib/chat";
import { useSupabaseClient } from "@/lib/supabase";
import type { ChatPermissionState, Message, Profile } from "@/lib/types";

export default function ChatPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId;
  const { user } = useUser();
  const supabase = useSupabaseClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showContact, setShowContact] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"clear" | "remove" | "block" | null>(null);
  const [permission, setPermission] = useState<ChatPermissionState>("allowed");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const currentUserId = user?.id;

  const isNearBottom = () => {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const scrollToBottom = (smooth = true) =>
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });

  useEffect(() => {
    const run = async () => {
      if (!currentUserId) return;
      try {
        setLoading(true);
        const history = await fetchMessagesAfterClear(supabase, conversationId, currentUserId);
        setMessages(history);
        requestAnimationFrame(() => scrollToBottom(false));

        const { data: participant } = await supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", conversationId)
          .neq("user_id", currentUserId)
          .limit(1)
          .single();

        if (participant?.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, username, age, email, phone, avatar_url")
            .eq("id", participant.user_id)
            .single();
          if (profile) {
            const casted = profile as Profile;
            setOtherUser(casted);
            const nextPermission = await getChatPermissionState(supabase, currentUserId, casted.id);
            setPermission(nextPermission);
          }
        }

        await markMessagesRead(supabase, conversationId, currentUserId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load messages.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [conversationId, currentUserId, supabase]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const incoming = payload.new as Message;
          const atBottom = isNearBottom();

          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });

          if (incoming.sender_id === currentUserId || atBottom) {
            requestAnimationFrame(() => scrollToBottom(true));
          }
          if (incoming.sender_id !== currentUserId) {
            void markMessagesRead(supabase, conversationId, currentUserId);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, supabase]);

  const displayedMessages = useMemo(() => {
    const base = messages.map((msg) => ({ ...msg, isMine: msg.sender_id === currentUserId }));
    const query = searchTerm.trim().toLowerCase();
    if (!query) return base;
    return base.filter((msg) => msg.content.toLowerCase().includes(query));
  }, [messages, currentUserId, searchTerm]);

  const permissionNotice = useMemo(() => {
    if (permission === "blocked_by_me") return "You blocked this user.";
    if (permission === "blocked_by_them") return "You cannot message this user.";
    if (permission === "not_friends") {
      return "You are no longer friends. Send a request to chat again.";
    }
    return null;
  }, [permission]);

  const canSend = permission === "allowed";

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!currentUserId || !trimmed || !canSend) return;
    try {
      setInput("");
      const inserted = await sendMessage(supabase, conversationId, currentUserId, trimmed);
      setMessages((prev) => (prev.some((m) => m.id === inserted.id) ? prev : [...prev, inserted]));
      requestAnimationFrame(() => scrollToBottom(true));
    } catch (e) {
      setInput(trimmed);
      setError(e instanceof Error ? e.message : "Could not send message.");
    }
  };

  const executeAction = async () => {
    if (!currentUserId || !otherUser || !confirmAction) return;
    try {
      if (confirmAction === "clear") {
        await clearChatForUser(supabase, conversationId, currentUserId);
        setMessages([]);
      }
      if (confirmAction === "remove") {
        await removeFriend(supabase, currentUserId, otherUser.id);
        setPermission("not_friends");
      }
      if (confirmAction === "block") {
        await blockUser(supabase, currentUserId, otherUser.id);
        setPermission("blocked_by_me");
      }
      setConfirmAction(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    }
  };

  return (
    <AppShell>
      <main className="flex min-h-dvh flex-col">
        <ChatHeader
          name={otherUser?.full_name || "Chat"}
          username={otherUser?.username}
          imageUrl={otherUser?.avatar_url}
          onViewContact={() => setShowContact(true)}
          onSearchInChat={() => setSearchOpen((v) => !v)}
          onClearChat={() => setConfirmAction("clear")}
          onRemoveFriend={() => setConfirmAction("remove")}
          onBlockUser={() => setConfirmAction("block")}
        />
        {searchOpen ? (
          <div className="border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search in chat"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm outline-none"
            />
          </div>
        ) : null}
        {error ? <div className="mx-3 mt-2 rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">{error}</div> : null}

        <section
          ref={containerRef}
          className="flex-1 space-y-1 overflow-y-auto bg-[radial-gradient(circle_at_top,#15212a_0%,#0B141A_45%,#0B141A_100%)] p-3"
        >
          {loading ? <LoadingSpinner label="Loading messages..." /> : null}
          {!loading && displayedMessages.length === 0 ? (
            <EmptyState title="Start chatting" description="Send your first message." />
          ) : null}
          {!loading
            ? displayedMessages.map((msg) => (
                <div key={msg.id} className="animate-enter">
                  <MessageBubble content={msg.content} createdAt={msg.created_at} isMine={msg.isMine} />
                </div>
              ))
            : null}
          <div ref={bottomRef} />
        </section>

        {permissionNotice ? (
          <div className="border-t border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-amber-300">
            {permissionNotice}
          </div>
        ) : null}

        <div className={canSend ? "" : "pointer-events-none opacity-45"}>
          <MessageInputBar value={input} onChange={setInput} onSend={() => void handleSend()} />
        </div>

        {showContact && otherUser ? (
          <div className="absolute inset-0 z-50 bg-black/45" onClick={() => setShowContact(false)}>
            <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t border-[var(--border)] bg-[var(--surface)] p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <Avatar name={otherUser.full_name || otherUser.username || "User"} imageUrl={otherUser.avatar_url} />
                <div>
                  <p className="font-semibold">{otherUser.full_name || "User"}</p>
                  <p className="text-xs text-[var(--text-secondary)]">@{otherUser.username || "username"}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-white" onClick={() => setShowContact(false)}>Message</button>
                <button className="rounded-full border border-red-400/60 px-3 py-1 text-xs text-red-300" onClick={() => { setShowContact(false); setConfirmAction("remove"); }}>Remove friend</button>
                <button className="rounded-full border border-red-400/60 px-3 py-1 text-xs text-red-300" onClick={() => { setShowContact(false); setConfirmAction("block"); }}>Block</button>
              </div>
            </div>
          </div>
        ) : null}

        {confirmAction ? (
          <div className="absolute inset-0 z-50 grid place-items-center bg-black/55 px-4">
            <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <h3 className="text-base font-semibold">
                {confirmAction === "clear" ? "Clear chat?" : confirmAction === "remove" ? `Remove @${otherUser?.username || "user"}?` : `Block @${otherUser?.username || "user"}?`}
              </h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {confirmAction === "clear"
                  ? "Messages will only be cleared for you."
                  : confirmAction === "remove"
                    ? "You will not be able to message each other until a new request is accepted."
                    : "They will not be able to message you."}
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setConfirmAction(null)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm">Cancel</button>
                <button onClick={() => void executeAction()} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white">
                  {confirmAction === "clear" ? "Clear" : confirmAction === "remove" ? "Remove" : "Block"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </AppShell>
  );
}
