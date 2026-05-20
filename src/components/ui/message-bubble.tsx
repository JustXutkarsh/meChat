import { format } from "date-fns";

export function MessageBubble({ content, createdAt, isMine }: { content: string; createdAt: string; isMine: boolean; }) {
  return (
    <div className={isMine ? "flex justify-end" : "flex justify-start"}>
      <div className={isMine ? "max-w-[78%] rounded-2xl rounded-br-sm bg-[linear-gradient(135deg,#8B5CF6,#6366F1,#22D3EE)] px-3 py-2 text-[var(--text-primary)] shadow-[0_10px_30px_rgba(139,92,246,0.25)] animate-enter" : "max-w-[78%] rounded-2xl rounded-bl-sm border border-[var(--border)] bg-[var(--received-bubble)] px-3 py-2 text-[var(--text-primary)] animate-enter"}>
        <p className="whitespace-pre-wrap break-words text-sm leading-5">{content}</p>
        <p className={`mt-1 text-right text-[11px] ${isMine ? "text-white/80" : "text-[var(--text-secondary)]"}`}>{format(new Date(createdAt), "p")}</p>
      </div>
    </div>
  );
}
