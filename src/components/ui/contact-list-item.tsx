import { Avatar } from "@/components/avatar";
import type { SearchUserItem } from "@/lib/types";

export function ContactListItem({
  item,
  onAdd,
  onAccept,
  onMessage,
}: {
  item: SearchUserItem;
  onAdd: () => void;
  onAccept: () => void;
  onMessage: () => void;
}) {
  const { profile, requestState } = item;

  return (
    <div className="flex h-[72px] w-full items-center gap-3 px-2 text-left transition-colors hover:bg-[var(--surface-hover)]">
      <Avatar name={profile.full_name || profile.username || "User"} imageUrl={profile.avatar_url} />
      <div className="min-w-0 flex-1 border-b border-[var(--border)] py-3">
        <p className="truncate text-[15px] font-semibold">{profile.full_name || "User"}</p>
        <p className="truncate text-xs text-[var(--text-secondary)]">{profile.username ? `@${profile.username}` : "Set username from profile"}</p>
      </div>
      {requestState === "none" ? (
        <button onClick={onAdd} className="rounded-full border border-[var(--primary)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">Add</button>
      ) : null}
      {requestState === "requested" ? (
        <button disabled className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-secondary)]">Requested</button>
      ) : null}
      {requestState === "incoming" ? (
        <button onClick={onAccept} className="rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-white">Accept</button>
      ) : null}
      {requestState === "accepted" ? (
        <button onClick={onMessage} className="rounded-full bg-[var(--whatsapp-green)] px-3 py-1 text-xs font-semibold text-white">Message</button>
      ) : null}
    </div>
  );
}
