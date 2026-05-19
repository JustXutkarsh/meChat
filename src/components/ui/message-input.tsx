export function MessageInput({ value, onChange, onSend }: { value: string; onChange: (v: string) => void; onSend: () => void; }) {
  const disabled = !value.trim();
  return (
    <div className="safe-bottom border-t border-[var(--border)] bg-[var(--surface)] px-3 pb-3 pt-2">
      <div className="flex items-center gap-2 rounded-full bg-[var(--surface-elevated)] p-1.5">
        <span className="pl-2 text-[var(--text-secondary)]">🙂</span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Message"
          rows={1}
          className="max-h-28 min-h-[36px] flex-1 resize-none bg-transparent px-1 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!disabled) onSend();
            }
          }}
        />
        <button disabled={disabled} onClick={onSend} className="grid h-9 w-9 place-items-center rounded-full bg-[var(--primary)] text-white transition disabled:opacity-40" aria-label="Send message">➤</button>
      </div>
    </div>
  );
}
