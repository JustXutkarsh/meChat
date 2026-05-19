export function GradientLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-11 w-11";

  return (
    <div className={`relative ${dims} rounded-2xl bg-[linear-gradient(135deg,#7C3AED,#2563EB)] shadow-[0_10px_30px_rgba(37,99,235,0.35)]`}>
      <div className="absolute inset-[2px] rounded-[14px] bg-[linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0.03))]" />
      <div className="absolute inset-0 grid place-items-center text-lg font-bold text-white">m</div>
    </div>
  );
}
