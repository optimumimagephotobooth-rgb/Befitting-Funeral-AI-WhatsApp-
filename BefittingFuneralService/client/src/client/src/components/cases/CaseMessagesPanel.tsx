export type MessageDirection =
  | 'incoming'
  | 'outgoing'
  | 'inbound'
  | 'outbound'
  | string;

interface CaseMessage {
  id: string;
  direction: MessageDirection;
  body: string;
  timestamp: string;
  author?: string;
}

interface CaseMessagesPanelProps {
  messages: CaseMessage[];
  loading?: boolean;
  draftText: string;
  draftError?: string | null;
  generating?: boolean;
  sending?: boolean;
  onDraftChange: (value: string) => void;
  onGenerateDraft: () => void;
  onSendDraft: () => void;
  onUploadAttachment?: () => void;
  onAnnotate?: (messageId: string) => void;
  stage?: string;
}

export default function CaseMessagesPanel({
  messages,
  loading,
  draftText,
  draftError,
  generating,
  sending,
  onDraftChange,
  onGenerateDraft,
  onSendDraft,
  onUploadAttachment,
  onAnnotate,
  stage
}: CaseMessagesPanelProps) {
  return (
    <section className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50">
        <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-xs uppercase tracking-wide text-slate-500">
          <span>Message timeline</span>
          <button
            className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 hover:border-slate-500"
            onClick={onUploadAttachment}
          >
            Upload file
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-4 py-3 space-y-3 text-sm">
          {loading ? (
            <p className="text-slate-400">Loading messages…</p>
          ) : messages.length === 0 ? (
            <p className="text-slate-500">No messages yet.</p>
          ) : (
            messages.map((message) => {
              const normalizedDirection = message.direction?.toLowerCase?.() || 'incoming';
              const isInbound = normalizedDirection === 'inbound' || normalizedDirection === 'incoming';
              return (
                <article
                  key={message.id}
                  className={`rounded-2xl border px-4 py-3 ${
                    isInbound
                      ? 'border-slate-700 bg-slate-900/80 text-slate-100'
                      : 'border-emerald-700/60 bg-emerald-500/10 text-emerald-100'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-400">
                    <span>{isInbound ? 'Family' : 'Staff/AI'}</span>
                    <time>{new Date(message.timestamp).toLocaleString()}</time>
                  </div>
                  <p className="mt-2 text-sm text-slate-100">{message.body}</p>
                  <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                    <span>{message.author || 'Unknown author'}</span>
                    <button
                      className="text-amber-400 hover:text-amber-300"
                      onClick={() => onAnnotate?.(message.id)}
                    >
                      Annotate
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      <aside className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 space-y-3">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
          <span>AI-assisted reply</span>
          {stage && (
            <span className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300">
              Stage: {stage}
            </span>
          )}
        </div>
        <textarea
          value={draftText}
          onChange={(event) => onDraftChange(event.target.value)}
          className="mt-3 h-48 w-full rounded-2xl border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-200 focus:border-amber-500 focus:outline-none"
          placeholder="Compose a condolence message or update…"
        />
        {draftError && <p className="text-xs text-rose-400">{draftError}</p>}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <button
            className="rounded-full border border-slate-600 px-4 py-2 font-semibold text-slate-200 hover:border-slate-400 disabled:opacity-50"
            onClick={onGenerateDraft}
            disabled={generating}
          >
            {generating ? 'Generating…' : 'Generate draft'}
          </button>
          <button
            className="rounded-full border border-slate-600 px-4 py-2 font-semibold text-slate-200 hover:border-slate-400"
            onClick={onSendDraft}
            disabled={sending || !draftText.trim()}
          >
            {sending ? 'Sending…' : 'Send via WhatsApp'}
          </button>
          <button
            className="rounded-full border border-slate-600 px-4 py-2 font-semibold text-slate-200 hover:border-slate-400"
            onClick={onUploadAttachment}
          >
            Attach file
          </button>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          AI suggestions are informative only; staff must approve every message.
        </p>
      </aside>
    </section>
  );
}

