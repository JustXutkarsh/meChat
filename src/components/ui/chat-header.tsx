import Link from "next/link";
import { Avatar } from "@/components/avatar";

export function ChatHeader({ name, username, imageUrl }: { name: string; username?: string | null; imageUrl?: string | null; }) {
  return (
    <header className="sticky top-0 z-20 h-16 border-b border-[var(--border)] bg-[var(--surface)] px-3">
      <div className="flex h-full items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/chats" className="text-[var(--text-secondary)]">←</Link>
          <Avatar name={name} imageUrl={imageUrl} size="sm" />
          <div>
            <p className="text-sm font-semibold">{name}</p>
            <p className="text-xs text-[var(--text-secondary)]">{username ? `@${username}` : "meChat"}</p>
          </div>
        </div>
        <button className="text-[var(--text-secondary)]" aria-label="More">⋮</button>
      </div>
    </header>
  );
}
