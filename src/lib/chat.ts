import type {
  ChatListItem,
  FriendRequest,
  Message,
  NotificationItem,
  Profile,
  SearchUserItem,
} from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function searchUsers(supabase: SupabaseClient, currentUserId: string, searchTerm: string) {
  let query = supabase
    .from("profiles")
    .select("id, full_name, username, age, email, phone, avatar_url")
    .neq("id", currentUserId)
    .limit(20);

  const normalized = searchTerm.trim().toLowerCase();
  if (normalized) {
    query = query.or(`username.ilike.%${normalized}%,full_name.ilike.%${normalized}%`);
  }

  const { data: users, error } = await query.order("username", { ascending: true });
  if (error) throw new Error(error.message);

  const profiles = (users ?? []) as Profile[];
  if (!profiles.length) return [] as SearchUserItem[];

  const otherIds = profiles.map((p) => p.id);

  const { data: requestRows, error: requestError } = await supabase
    .from("friend_requests")
    .select("id, sender_id, receiver_id, status, created_at, updated_at")
    .in("sender_id", [currentUserId, ...otherIds])
    .in("receiver_id", [currentUserId, ...otherIds]);

  if (requestError) throw new Error(requestError.message);

  const requests = (requestRows ?? []) as FriendRequest[];

  return profiles.map((profile) => {
    const request = requests.find(
      (row) =>
        (row.sender_id === currentUserId && row.receiver_id === profile.id) ||
        (row.sender_id === profile.id && row.receiver_id === currentUserId)
    );

    if (!request) return { profile, requestState: "none", request: null } as SearchUserItem;
    if (request.status === "accepted") return { profile, requestState: "accepted", request } as SearchUserItem;
    if (request.status === "pending" && request.sender_id === currentUserId) {
      return { profile, requestState: "requested", request } as SearchUserItem;
    }
    if (request.status === "pending" && request.receiver_id === currentUserId) {
      return { profile, requestState: "incoming", request } as SearchUserItem;
    }

    return { profile, requestState: "none", request: null } as SearchUserItem;
  });
}

export function getChatPreview(chat: ChatListItem, currentUserId: string) {
  if (!chat.lastMessage) return "No messages yet";
  if (chat.lastMessageSenderId === currentUserId) return `You: ${chat.lastMessage}`;
  return chat.lastMessage;
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
    .select("id, created_at, last_message, last_message_at, last_message_sender_id")
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

      const { count, error: unreadError } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversation.id)
        .neq("sender_id", currentUserId)
        .eq("is_read", false);
      if (unreadError) throw new Error(unreadError.message);

      return {
        conversationId: conversation.id,
        otherUser: otherUser as Profile,
        lastMessage: conversation.last_message,
        lastMessageAt: conversation.last_message_at,
        lastMessageSenderId: conversation.last_message_sender_id,
        unreadCount: count ?? 0,
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

export async function createNotification(
  supabase: SupabaseClient,
  actorId: string,
  userId: string,
  type: NotificationItem["type"],
  title: string,
  body: string,
  metadata: Record<string, unknown> = {}
) {
  const { error } = await supabase.from("notifications").insert({
    actor_id: actorId,
    user_id: userId,
    type,
    title,
    body,
    metadata,
  });
  if (error) throw new Error(error.message);
}

export async function sendFriendRequest(
  supabase: SupabaseClient,
  currentUserId: string,
  receiverId: string,
  senderName: string
) {
  if (currentUserId === receiverId) throw new Error("You cannot send a request to yourself.");

  const { data: existing, error: existingError } = await supabase
    .from("friend_requests")
    .select("id, sender_id, receiver_id, status, created_at, updated_at")
    .in("sender_id", [currentUserId, receiverId])
    .in("receiver_id", [currentUserId, receiverId]);

  if (existingError) throw new Error(existingError.message);
  const existingRelation = (existing ?? []).find(
    (row) =>
      (row.sender_id === currentUserId && row.receiver_id === receiverId) ||
      (row.sender_id === receiverId && row.receiver_id === currentUserId)
  );
  if (existingRelation?.status === "pending") throw new Error("Friend request already pending.");
  if (existingRelation?.status === "accepted") throw new Error("You are already connected.");

  const { data: inserted, error } = await supabase
    .from("friend_requests")
    .insert({ sender_id: currentUserId, receiver_id: receiverId, status: "pending" })
    .select("id")
    .single();
  if (error || !inserted) throw new Error(error?.message || "Could not send request.");

  await createNotification(
    supabase,
    currentUserId,
    receiverId,
    "friend_request",
    "New friend request",
    `${senderName} sent you a friend request`,
    { request_id: inserted.id }
  );

  return inserted.id as string;
}

export async function getOrCreateConversation(
  supabase: SupabaseClient,
  currentUserId: string,
  otherUserId: string
) {
  const { data: relationRows, error: relationError } = await supabase
    .from("friend_requests")
    .select("status")
    .in("sender_id", [currentUserId, otherUserId])
    .in("receiver_id", [currentUserId, otherUserId])
    .eq("status", "accepted")
    .limit(1);

  if (relationError) throw new Error(relationError.message);
  if (!relationRows?.length) throw new Error("Chat is available after friend request acceptance.");

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

  const conversationId = crypto.randomUUID();
  const { error: conversationError } = await supabase
    .from("conversations")
    .insert({ id: conversationId });
  if (conversationError) throw new Error(conversationError.message);

  const { error: participantsError } = await supabase.from("conversation_participants").insert([
    { conversation_id: conversationId, user_id: currentUserId },
    { conversation_id: conversationId, user_id: otherUserId },
  ]);
  if (participantsError) throw new Error(participantsError.message);

  return conversationId;
}

export async function acceptFriendRequest(
  supabase: SupabaseClient,
  requestId: string,
  currentUserId: string,
  receiverName: string
) {
  const { data: request, error: requestError } = await supabase
    .from("friend_requests")
    .select("id, sender_id, receiver_id, status")
    .eq("id", requestId)
    .single();

  if (requestError || !request) throw new Error(requestError?.message || "Request not found.");
  if (request.receiver_id !== currentUserId) throw new Error("Only receiver can accept this request.");
  if (request.status !== "pending") throw new Error("Request is no longer pending.");

  const { error: updateError } = await supabase
    .from("friend_requests")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (updateError) throw new Error(updateError.message);

  const conversationId = await getOrCreateConversation(supabase, request.sender_id, request.receiver_id);

  await createNotification(
    supabase,
    currentUserId,
    request.sender_id,
    "friend_request_accepted",
    "Request accepted",
    `${receiverName} accepted your request`,
    { request_id: requestId, conversation_id: conversationId }
  );

  return conversationId;
}

export async function rejectFriendRequest(supabase: SupabaseClient, requestId: string, currentUserId: string) {
  const { data: request, error: requestError } = await supabase
    .from("friend_requests")
    .select("id, receiver_id, status")
    .eq("id", requestId)
    .single();

  if (requestError || !request) throw new Error(requestError?.message || "Request not found.");
  if (request.receiver_id !== currentUserId) throw new Error("Only receiver can reject this request.");
  if (request.status !== "pending") throw new Error("Request is no longer pending.");

  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) throw new Error(error.message);
}

export async function fetchNotifications(supabase: SupabaseClient, currentUserId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, user_id, actor_id, type, title, body, is_read, metadata, created_at")
    .eq("user_id", currentUserId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return (data ?? []) as NotificationItem[];
}

export async function markNotificationsRead(supabase: SupabaseClient, currentUserId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", currentUserId)
    .eq("is_read", false);
  if (error) throw new Error(error.message);
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
    .update({
      last_message: trimmed,
      last_message_at: nowIso,
      last_message_sender_id: senderId,
      updated_at: nowIso,
    })
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
