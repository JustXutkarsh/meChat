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
  const gradients = [
    "from-violet-500 to-pink-500",
    "from-cyan-400 to-blue-500",
    "from-orange-400 to-pink-500",
    "from-green-400 to-cyan-400",
    "from-fuchsia-500 to-indigo-500",
  ];
  const seed = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const gradient = gradients[seed % gradients.length];
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={clsx("avatar-ring group relative grid place-items-center rounded-full bg-gradient-to-br p-[2px] transition-transform duration-200", gradient, size === "sm" ? "h-9 w-9" : "h-11 w-11")}>
      <div
        className={clsx(
          "relative grid h-full w-full place-items-center overflow-hidden rounded-full border border-white/10 bg-[linear-gradient(160deg,#1A2532,#111821)] font-semibold text-[var(--text-secondary)]",
          size === "sm" ? "text-xs" : "text-sm"
        )}
      >
        <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.22),transparent_36%)]" />
        {imageUrl ? <img src={imageUrl} alt={name} className="h-full w-full object-cover" /> : <span className="text-white/90">{initials}</span>}
      </div>
    </div>
  );
}
