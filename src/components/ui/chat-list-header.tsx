import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export function ChatListHeader() {
  return (
    <header className="sticky top-0 z-20 h-16 border-b border-[var(--border)] bg-[var(--surface)] px-4">
      <div className="flex h-full items-center justify-between">
        <h1 className="text-xl font-bold">meChat</h1>
        <div className="flex items-center gap-2">
          <Link href="/new-chat" className="grid h-9 w-9 place-items-center rounded-full bg-[var(--primary)] text-white" aria-label="New chat">✎</Link>
          <UserButton userProfileUrl="/profile" />
        </div>
      </div>
    </header>
  );
}
