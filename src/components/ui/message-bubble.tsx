import { format } from "date-fns";

export function MessageBubble({ content, createdAt, isMine }: { content: string; createdAt: string; isMine: boolean; }) {
  return (
    <div className={isMine ? "flex justify-end" : "flex justify-start"}>
      <div className={isMine ? "max-w-[75%] rounded-2xl rounded-br-sm bg-[linear-gradient(135deg,#005C4B,#6D5DFB)] px-3 py-2 text-[var(--text-primary)]" : "max-w-[75%] rounded-2xl rounded-bl-sm bg-[var(--received-bubble)] px-3 py-2 text-[var(--text-primary)]"}>
        <p className="whitespace-pre-wrap break-words text-sm leading-5">{content}</p>
        <p className="mt-1 text-right text-[11px] text-[var(--text-secondary)]">{format(new Date(createdAt), "p")}</p>
      </div>
    </div>
  );
}
