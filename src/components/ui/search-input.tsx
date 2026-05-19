export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string; }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-[var(--surface-elevated)] px-3 py-2.5 text-[var(--text-secondary)]">
      <span className="text-sm">🔍</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]" />
    </div>
  );
}
