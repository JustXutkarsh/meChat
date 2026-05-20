import clsx from "clsx";

export function AppShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="relative min-h-dvh overflow-hidden text-[var(--text-primary)]">
      <div className="animated-orb left-[-120px] top-[-80px] h-64 w-64 bg-[rgba(139,92,246,0.28)]" />
      <div className="animated-orb right-[-120px] top-[18%] h-72 w-72 bg-[rgba(34,211,238,0.2)] [animation-delay:1.2s]" />
      <div className="animated-orb bottom-[-100px] left-[30%] h-64 w-64 bg-[rgba(236,72,153,0.2)] [animation-delay:2.4s]" />
      <div className="relative mx-auto min-h-dvh w-full max-w-[430px] bg-[rgba(5,10,18,0.82)] backdrop-blur-2xl md:my-3 md:min-h-[calc(100dvh-24px)] md:rounded-[34px] md:border md:border-[var(--border)] md:shadow-[0_0_80px_rgba(139,92,246,0.18),0_40px_100px_rgba(0,0,0,0.45)]">
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" />
        <div className={clsx("relative min-h-dvh md:min-h-[calc(100dvh-24px)]", className)}>{children}</div>
      </div>
    </div>
  );
}
