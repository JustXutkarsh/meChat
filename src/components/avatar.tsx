import clsx from "clsx";

export function Avatar({
  name,
  imageUrl,
  size = "md",
}: {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md";
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={clsx(
        "grid place-items-center overflow-hidden rounded-full border border-[var(--border)] bg-[linear-gradient(160deg,#1A2532,#111821)] font-semibold text-[var(--text-secondary)]",
        size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm"
      )}
    >
      {imageUrl ? <img src={imageUrl} alt={name} className="h-full w-full object-cover" /> : initials}
    </div>
  );
}
