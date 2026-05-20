import Link from "next/link";
import { format } from "date-fns";
import { Avatar } from "@/components/avatar";
import { getChatPreview } from "@/lib/chat";
import type { ChatListItem as TChatListItem } from "@/lib/types";

export function ChatListItem({ chat, currentUserId }: { chat: TChatListItem; currentUserId: string }) {
  const preview = getChatPreview(chat, currentUserId);
  const hasUnread = chat.unreadCount > 0;

  return (
    <Link href={`/chats/${chat.conversationId}`} className="group flex h-[72px] items-center gap-3 rounded-xl px-2 transition-colors hover:bg-[var(--surface-hover)]">
      <Avatar name={chat.otherUser.full_name || chat.otherUser.username || "User"} imageUrl={chat.otherUser.avatar_url} />
      <div className="min-w-0 flex-1 border-b border-[var(--border)] py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[15px] font-semibold text-[var(--text-primary)]">{chat.otherUser.full_name || "User"}</p>
          <span className="text-[11px] text-[var(--text-secondary)]">{chat.lastMessageAt ? format(new Date(chat.lastMessageAt), "p") : ""}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`truncate text-sm ${hasUnread ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>{preview}</p>
          {hasUnread ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--primary)] px-1.5 text-[11px] font-semibold text-white">{chat.unreadCount}</span> : null}
        </div>
      </div>
    </Link>
  );
}
