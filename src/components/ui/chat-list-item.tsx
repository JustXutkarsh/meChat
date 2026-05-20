import Link from "next/link";
import { format } from "date-fns";
import { Avatar } from "@/components/avatar";
import { getChatPreview } from "@/lib/chat";
import type { ChatListItem as TChatListItem } from "@/lib/types";

export function ChatListItem({ chat, currentUserId, isOnline }: { chat: TChatListItem; currentUserId: string; isOnline?: boolean }) {
  const preview = getChatPreview(chat, currentUserId);
  const hasUnread = chat.unreadCount > 0;

  return (
    <Link href={`/chats/${chat.conversationId}`} className={`group relative mx-3 my-2 flex items-center gap-3 overflow-hidden rounded-3xl border px-3 py-3 transition duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-[rgba(30,41,59,0.72)] ${hasUnread ? "border-[rgba(139,92,246,0.28)] bg-[rgba(15,23,42,0.7)]" : "border-[rgba(148,163,184,0.1)] bg-[rgba(15,23,42,0.56)]"}`}>
      {hasUnread ? <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-[linear-gradient(180deg,#8B5CF6,#EC4899)]" /> : null}
      <Avatar name={chat.otherUser.full_name || chat.otherUser.username || "User"} imageUrl={chat.otherUser.avatar_url} isOnline={isOnline} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[15px] font-semibold text-[var(--text-primary)]">{chat.otherUser.full_name || "User"}</p>
          <span className="text-[11px] text-[var(--text-secondary)]">{chat.lastMessageAt ? format(new Date(chat.lastMessageAt), "p") : ""}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`truncate text-sm ${hasUnread ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>{preview}</p>
          {hasUnread ? <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-[linear-gradient(135deg,#8B5CF6,#EC4899)] px-1.5 text-[11px] font-semibold text-white shadow-[0_0_20px_rgba(236,72,153,0.35)] [animation:pulse-soft_1.8s_ease-in-out_infinite]">{chat.unreadCount}</span> : null}
        </div>
      </div>
    </Link>
  );
}
