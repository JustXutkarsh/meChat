export function SkeletonChatItem() {
  return (
    <div className="flex h-[72px] items-center gap-3 px-2 animate-pulse">
      <div className="h-12 w-12 rounded-full bg-[var(--surface-elevated)]" />
      <div className="flex-1 border-b border-[var(--border)] py-3">
        <div className="mb-2 h-3 w-32 rounded bg-[var(--surface-elevated)]" />
        <div className="h-3 w-48 rounded bg-[var(--surface-elevated)]" />
      </div>
      <div className="h-3 w-10 rounded bg-[var(--surface-elevated)]" />
    </div>
  );
}
