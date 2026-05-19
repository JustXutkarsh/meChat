"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { AppShell } from "@/components/ui/app-shell";
import { ChatHeader } from "@/components/ui/chat-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { MessageBubble } from "@/components/ui/message-bubble";
import { MessageInputBar } from "@/components/ui/message-input-bar";
import { fetchMessages, markMessagesRead, sendMessage } from "@/lib/chat";
import { useSupabaseClient } from "@/lib/supabase";
import type { Message, Profile } from "@/lib/types";

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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const currentUserId = user?.id;

  const isNearBottom = () => {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const scrollToBottom = (smooth = true) => bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });

  useEffect(() => {
    const run = async () => {
      if (!currentUserId) return;
      try {
        setLoading(true);
        const history = await fetchMessages(supabase, conversationId);
        setMessages(history);
        requestAnimationFrame(() => scrollToBottom(false));

        const { data: participant } = await supabase.from("conversation_participants").select("user_id").eq("conversation_id", conversationId).neq("user_id", currentUserId).limit(1).single();
        if (participant?.user_id) {
          const { data: profile } = await supabase.from("profiles").select("id, full_name, username, age, email, phone, avatar_url").eq("id", participant.user_id).single();
          if (profile) setOtherUser(profile as Profile);
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
    const channel = supabase.channel(`messages:${conversationId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
      const incoming = payload.new as Message;
      const atBottom = isNearBottom();

      setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())));

      if (incoming.sender_id === currentUserId || atBottom) requestAnimationFrame(() => scrollToBottom(true));
      if (currentUserId && incoming.sender_id !== currentUserId) void markMessagesRead(supabase, conversationId, currentUserId);
    }).subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, currentUserId, supabase]);

  const grouped = useMemo(() => messages.map((msg) => ({ ...msg, isMine: msg.sender_id === currentUserId })), [messages, currentUserId]);

  const handleSend = async () => {
    if (!currentUserId || !input.trim()) return;
    try {
      await sendMessage(supabase, conversationId, currentUserId, input);
      setInput("");
      requestAnimationFrame(() => scrollToBottom(true));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send message.");
    }
  };

  return (
    <AppShell>
      <main className="flex min-h-dvh flex-col">
        <ChatHeader name={otherUser?.full_name || "Chat"} username={otherUser?.username} imageUrl={otherUser?.avatar_url} />
        {error ? <div className="mx-3 mt-2 rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">{error}</div> : null}

        <section ref={containerRef} className="flex-1 space-y-1 overflow-y-auto bg-[radial-gradient(circle_at_top,#15212a_0%,#0B141A_45%,#0B141A_100%)] p-3">
          {loading ? <LoadingSpinner label="Loading messages..." /> : null}
          {!loading && grouped.length === 0 ? <EmptyState title="Start chatting" description="Send your first message." /> : null}
          {!loading ? grouped.map((msg) => <div key={msg.id} className="animate-enter"><MessageBubble content={msg.content} createdAt={msg.created_at} isMine={msg.isMine} /></div>) : null}
          <div ref={bottomRef} />
        </section>

        <MessageInputBar value={input} onChange={setInput} onSend={() => void handleSend()} />
      </main>
    </AppShell>
  );
}
