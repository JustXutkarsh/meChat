import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/avatar";

export function ChatHeader({
  name,
  username,
  imageUrl,
  onViewContact,
  onSearchInChat,
  onClearChat,
  onRemoveFriend,
  onBlockUser,
}: {
  name: string;
  username?: string | null;
  imageUrl?: string | null;
  onViewContact?: () => void;
  onSearchInChat?: () => void;
  onClearChat?: () => void;
  onRemoveFriend?: () => void;
  onBlockUser?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-[var(--border)] bg-[rgba(11,17,32,0.74)] px-3 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/chats" className="grid h-8 w-8 place-items-center rounded-full border border-[var(--border)] bg-[rgba(15,23,42,0.66)] text-[var(--text-secondary)]">←</Link>
          <Avatar name={name} imageUrl={imageUrl} size="sm" />
          <div>
            <p className="text-sm font-semibold">{name}</p>
            <p className="text-xs text-[var(--text-secondary)]">{username ? `@${username}` : "meChat"}</p>
          </div>
        </div>
        <div className="relative">
          <button
            className="grid h-8 w-8 place-items-center rounded-full border border-[var(--border)] bg-[rgba(15,23,42,0.66)] text-[var(--text-secondary)] transition active:scale-95"
            aria-label="More"
            onClick={() => setOpen((v) => !v)}
          >
            ⋮
          </button>
          {open ? (
            <>
              <button className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} aria-label="Close menu" />
              <div className="absolute right-0 top-10 z-20 w-52 rounded-2xl border border-[var(--border)] bg-[rgba(15,23,42,0.86)] p-1.5 shadow-xl backdrop-blur-2xl animate-enter">
                <button onClick={() => { setOpen(false); onViewContact?.(); }} className="flex w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-[var(--surface-hover)]">👤 View contact</button>
                <button onClick={() => { setOpen(false); onSearchInChat?.(); }} className="flex w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-[var(--surface-hover)]">🔎 Search in chat</button>
                <button onClick={() => { setOpen(false); onClearChat?.(); }} className="flex w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-[var(--surface-hover)]">🧹 Clear chat</button>
                <button onClick={() => { setOpen(false); onRemoveFriend?.(); }} className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10">✂ Remove friend</button>
                <button onClick={() => { setOpen(false); onBlockUser?.(); }} className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10">⛔ Block user</button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
