import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export function ChatListHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[rgba(11,17,32,0.74)] px-4 pb-3 pt-4 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(139,92,246,0.8),rgba(34,211,238,0.8),transparent)]" />
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative inline-grid h-8 w-8 place-items-center overflow-hidden rounded-xl bg-[linear-gradient(135deg,#8B5CF6,#EC4899,#22D3EE)] text-sm font-bold text-white soft-glow">
              m
            </span>
            <h1 className="gradient-text text-2xl font-bold tracking-wide">meChat</h1>
          </div>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">talk different.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/new-chat" className="grid h-10 w-10 place-items-center rounded-full neon-button text-white transition-transform active:scale-95" aria-label="New chat">✎</Link>
          <UserButton userProfileUrl="/profile" />
        </div>
      </div>
    </header>
  );
}
