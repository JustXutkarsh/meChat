import { Avatar } from "@/components/avatar";
import type { Profile } from "@/lib/types";

export function ContactListItem({ profile, onClick }: { profile: Profile; onClick: () => void; }) {
  return (
    <button onClick={onClick} className="flex h-[72px] w-full items-center gap-3 px-2 text-left transition-colors hover:bg-[var(--surface-hover)]">
      <Avatar name={profile.full_name || profile.username || "User"} imageUrl={profile.avatar_url} />
      <div className="min-w-0 flex-1 border-b border-[var(--border)] py-3">
        <p className="truncate text-[15px] font-semibold">{profile.full_name || "User"}</p>
        <p className="truncate text-xs text-[var(--text-secondary)]">{profile.email || profile.phone || `@${profile.username}`}</p>
      </div>
    </button>
  );
}
