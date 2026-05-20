export function SkeletonChatItem() {
  return (
    <div className="mx-3 my-2 flex h-[82px] items-center gap-3 rounded-3xl border border-[var(--border)] bg-[rgba(15,23,42,0.56)] px-3">
      <div className="h-12 w-12 rounded-full shimmer" />
      <div className="flex-1 py-3">
        <div className="mb-2 h-3 w-32 rounded shimmer" />
        <div className="h-3 w-48 rounded shimmer" />
      </div>
      <div className="h-3 w-10 rounded shimmer" />
    </div>
  );
}
