import clsx from "clsx";

export function AppShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--text-primary)] md:bg-[radial-gradient(circle_at_top,#18222b_0%,#0b141a_48%,#0b141a_100%)]">
      <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-[var(--surface)] md:border-x md:border-[var(--border)] md:shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
        <div className={clsx("min-h-dvh", className)}>{children}</div>
      </div>
    </div>
  );
}
