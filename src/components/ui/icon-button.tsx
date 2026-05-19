import clsx from "clsx";

export function IconButton({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={clsx(
        "grid h-10 w-10 place-items-center rounded-full border transition-colors",
        active
          ? "border-transparent bg-[linear-gradient(135deg,#7C3AED,#2563EB)] text-white"
          : "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
      )}
    >
      {icon}
    </button>
  );
}
