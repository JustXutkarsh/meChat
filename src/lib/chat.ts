import type { ChatListItem, Message, Profile } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function searchUsers(supabase: SupabaseClient, currentUserId: string, searchTerm: string) {
  let query = supabase
    .from("profiles")
    .select("id, full_name, username, age, email, phone, avatar_url")
    .neq("id", currentUserId)
    .not("username", "is", null)
    .limit(20);

  const normalized = searchTerm.trim().toLowerCase();
  if (normalized) query = query.ilike("username", `%${normalized}%`);

  const { data, error } = await query.order("username", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Profile[];
}

export async function getChatList(supabase: SupabaseClient, currentUserId: string) {
  const { data: participantRows, error: participantError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", currentUserId);
  if (participantError) throw new Error(participantError.message);

  const conversationIds = [...new Set((participantRows ?? []).map((row) => row.conversation_id))];
  if (!conversationIds.length) return [] as ChatListItem[];

  const { data: conversations, error: conversationsError } = await supabase
    .from("conversations")
    .select("id, created_at, last_message, last_message_at")
    .in("id", conversationIds);
  if (conversationsError) throw new Error(conversationsError.message);

  const chatList = await Promise.all(
    (conversations ?? []).map(async (conversation) => {
      const { data: participants, error: participantsError } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversation.id)
        .neq("user_id", currentUserId)
        .limit(1)
        .single();
      if (participantsError) return null;

      const { data: otherUser, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, username, age, email, phone, avatar_url")
        .eq("id", participants.user_id)
        .single();
      if (profileError || !otherUser) return null;

      return {
        conversationId: conversation.id,
        otherUser: otherUser as Profile,
        lastMessage: conversation.last_message,
        lastMessageAt: conversation.last_message_at,
        createdAt: conversation.created_at,
      } as ChatListItem;
    })
  );

  return chatList
    .filter((item): item is ChatListItem => item !== null)
    .sort((a, b) => {
      const aTime = a.lastMessageAt || a.createdAt;
      const bTime = b.lastMessageAt || b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
}

export async function getOrCreateConversation(
  supabase: SupabaseClient,
  currentUserId: string,
  otherUserId: string
) {
  const { data: currentRows, error: currentError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", currentUserId);
  if (currentError) throw new Error(currentError.message);

  const { data: otherRows, error: otherError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", otherUserId);
  if (otherError) throw new Error(otherError.message);

  const currentIds = new Set((currentRows ?? []).map((row) => row.conversation_id));
  const existing = (otherRows ?? []).find((row) => currentIds.has(row.conversation_id));
  if (existing) return existing.conversation_id;

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .insert({})
    .select("id")
    .single();
  if (conversationError || !conversation) throw new Error(conversationError?.message || "Create failed");

  const { error: participantsError } = await supabase.from("conversation_participants").insert([
    { conversation_id: conversation.id, user_id: currentUserId },
    { conversation_id: conversation.id, user_id: otherUserId },
  ]);
  if (participantsError) throw new Error(participantsError.message);

  return conversation.id;
}

export async function fetchMessages(supabase: SupabaseClient, conversationId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, content, message_type, is_read, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Message[];
}

export async function sendMessage(
  supabase: SupabaseClient,
  conversationId: string,
  senderId: string,
  content: string
) {
  const trimmed = content.trim();
  if (!trimmed) return;

  const { error: messageError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content: trimmed,
    message_type: "text",
  });
  if (messageError) throw new Error(messageError.message);

  const nowIso = new Date().toISOString();
  const { error: conversationError } = await supabase
    .from("conversations")
    .update({ last_message: trimmed, last_message_at: nowIso, updated_at: nowIso })
    .eq("id", conversationId);
  if (conversationError) throw new Error(conversationError.message);
}

export async function markMessagesRead(
  supabase: SupabaseClient,
  conversationId: string,
  currentUserId: string
) {
  const { error } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", currentUserId)
    .eq("is_read", false);
  if (error) throw new Error(error.message);
}
