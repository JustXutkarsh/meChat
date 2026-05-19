import Link from "next/link";

export function EmptyState({ title, description, actionHref, actionLabel }: { title: string; description: string; actionHref?: string; actionLabel?: string; }) {
  return (
    <div className="mx-auto mt-8 max-w-xs text-center">
      <p className="text-base font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
      {actionHref && actionLabel ? <Link href={actionHref} className="mt-4 inline-flex rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white">{actionLabel}</Link> : null}
    </div>
  );
}
