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
  lastMessageSenderId: string | null;
  unreadCount: number;
  createdAt: string;
};

export type FriendRequestStatus = "pending" | "accepted" | "rejected" | "removed";

export type FriendRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: FriendRequestStatus;
  created_at: string;
  updated_at: string;
};

export type SearchUserItem = {
  profile: Profile;
  requestState: "none" | "requested" | "incoming" | "accepted" | "removed";
  request: FriendRequest | null;
};

export type NotificationType = "friend_request" | "friend_request_accepted" | "message" | "video_call" | "missed_call";

export type NotificationItem = {
  id: string;
  user_id: string;
  actor_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ChatPermissionState = "allowed" | "not_friends" | "blocked_by_me" | "blocked_by_them";
