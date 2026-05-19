export type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  age: number | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  is_read: boolean;
  created_at: string;
};

export type ChatListItem = {
  conversationId: string;
  otherUser: Profile;
  lastMessage: string | null;
  lastMessageAt: string | null;
  createdAt: string;
};
