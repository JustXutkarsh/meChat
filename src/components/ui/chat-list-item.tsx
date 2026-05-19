import Link from "next/link";
import { format } from "date-fns";
import { Avatar } from "@/components/avatar";
import type { ChatListItem as TChatListItem } from "@/lib/types";

export function ChatListItem({ chat }: { chat: TChatListItem }) {
  return (
    <Link href={`/chats/${chat.conversationId}`} className="group flex h-[72px] items-center gap-3 rounded-xl px-2 transition-colors hover:bg-[var(--surface-hover)]">
      <Avatar name={chat.otherUser.full_name || chat.otherUser.username || "User"} imageUrl={chat.otherUser.avatar_url} />
      <div className="min-w-0 flex-1 border-b border-[var(--border)] py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[15px] font-semibold text-[var(--text-primary)]">{chat.otherUser.full_name || "User"}</p>
          <span className="text-[11px] text-[var(--text-secondary)]">{chat.lastMessageAt ? format(new Date(chat.lastMessageAt), "p") : ""}</span>
        </div>
        <p className="truncate text-sm text-[var(--text-secondary)]">{chat.lastMessage || "No messages yet"}</p>
      </div>
    </Link>
  );
}
