import Link from "next/link";

export function EmptyState({ title, description, actionHref, actionLabel }: { title: string; description: string; actionHref?: string; actionLabel?: string; }) {
  return (
    <div className="glass-card relative mx-auto mt-8 max-w-sm overflow-hidden rounded-3xl p-6 text-center">
      <div className="pointer-events-none absolute -left-8 top-3 h-20 w-20 rounded-full bg-[rgba(139,92,246,0.22)] blur-2xl" />
      <div className="pointer-events-none absolute -right-6 bottom-2 h-20 w-20 rounded-full bg-[rgba(34,211,238,0.2)] blur-2xl" />
      <div className="mb-4 flex justify-center gap-2 text-xl">
        <span className="inline-block [animation:float-orb_3.2s_ease-in-out_infinite]">💬</span>
        <span className="inline-block [animation:float-orb_3.2s_ease-in-out_infinite] [animation-delay:0.4s]">✨</span>
        <span className="inline-block [animation:float-orb_3.2s_ease-in-out_infinite] [animation-delay:0.8s]">🫧</span>
      </div>
      <p className="text-base font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
      {actionHref && actionLabel ? <Link href={actionHref} className="neon-button mt-4 inline-flex rounded-full px-4 py-2 text-sm font-semibold text-white transition-transform active:scale-95">{actionLabel}</Link> : null}
    </div>
  );
}
