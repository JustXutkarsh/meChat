import { useEffect, useRef, useState } from "react";

const EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂",
  "😉", "😍", "😘", "😎", "🤔", "😐", "😑", "🙄", "😴", "😭",
  "😡", "❤️", "💜", "💙", "💚", "👍", "👎", "🙏", "👏", "🔥", "✨",
  "🎉", "💯", "🤝", "👀",
];

export function MessageInput({
  value,
  onChange,
  onSend,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
}) {
  const disabled = !value.trim();
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) setIsEmojiOpen(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function onPickEmoji(emoji: string) {
    const el = textRef.current;
    if (!el) {
      onChange(`${value}${emoji}`);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}${emoji}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  }

  return (
    <div ref={containerRef} className="safe-bottom border-t border-[var(--border)] bg-[rgba(11,17,32,0.76)] px-3 pb-3 pt-2 backdrop-blur-xl">
      {isEmojiOpen ? (
        <div className="mb-2 max-h-48 overflow-y-auto rounded-t-3xl border border-[var(--border)] bg-[rgba(15,23,42,0.92)] p-2 shadow-[0_-20px_80px_rgba(0,0,0,0.45)] animate-enter">
          <div className="grid grid-cols-8 gap-1">
            {EMOJIS.map((emoji) => (
              <button key={emoji} onClick={() => onPickEmoji(emoji)} className="rounded-md p-1 text-xl transition-transform hover:scale-110 hover:bg-[var(--surface-hover)] active:scale-95">
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[rgba(15,23,42,0.88)] p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <button onClick={() => setIsEmojiOpen((v) => !v)} className="pl-2 text-[var(--text-secondary)] transition-transform hover:scale-110 active:scale-95" aria-label="Open emoji picker">🙂</button>
        <textarea
          ref={textRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Message"
          rows={1}
          className="max-h-28 min-h-[36px] flex-1 resize-none bg-transparent px-1 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!disabled) {
                onSend();
                setIsEmojiOpen(false);
              }
            }
          }}
        />
        <button
          disabled={disabled}
          onClick={() => {
            onSend();
            setIsEmojiOpen(false);
          }}
          className={`grid h-9 w-9 place-items-center rounded-full text-white transition active:scale-95 disabled:opacity-40 ${disabled ? "bg-[var(--primary)]" : "neon-button"}`}
          aria-label="Send message"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
