export type PresenceRow = {
  user_id: string;
  is_online: boolean;
  last_seen: string;
  updated_at: string;
};

export function isUserOnline(row?: PresenceRow | null) {
  if (!row) return false;
  if (!row.is_online) return false;
  const updatedAt = new Date(row.updated_at).getTime();
  return Date.now() - updatedAt <= 60_000;
}

export function formatLastSeen(iso?: string | null) {
  if (!iso) return "last seen recently";
  const date = new Date(iso);
  const now = new Date();

  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (isSameDay) return `last seen today at ${time}`;
  if (isYesterday) return `last seen yesterday at ${time}`;

  const dayMonth = date.toLocaleDateString([], { day: "2-digit", month: "short" });
  return `last seen ${dayMonth} at ${time}`;
}
