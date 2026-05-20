export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string; }) {
  return (
    <label className="group flex items-center gap-2 rounded-full border border-[var(--border)] bg-[rgba(15,23,42,0.72)] px-3 py-2.5 text-[var(--text-secondary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition duration-200 focus-within:border-[rgba(139,92,246,0.7)] focus-within:shadow-[0_0_0_4px_rgba(139,92,246,0.12),0_0_30px_rgba(139,92,246,0.16)]">
      <span className="text-sm transition-transform duration-200 group-focus-within:scale-110">🔍</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]" />
    </label>
  );
}
