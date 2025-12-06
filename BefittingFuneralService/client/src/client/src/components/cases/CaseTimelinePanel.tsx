interface CaseTimelineEvent {
  id: string;
  type: string;
  timestamp: string;
  description: string;
  metadata?: Record<string, unknown> | string | null;
}

interface CaseTimelinePanelProps {
  events: CaseTimelineEvent[];
  loading?: boolean;
}

export default function CaseTimelinePanel({ events, loading }: CaseTimelinePanelProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Case timeline</p>
        <p className="text-sm text-slate-400">Chronological event log from Supabase + audit records.</p>
      </header>

      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-slate-400">Loading timeline…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-slate-500">No events recorded yet.</p>
        ) : (
          events.map((event) => (
            <article
              key={event.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300"
            >
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                <span>{event.type}</span>
                <time>{new Date(event.timestamp).toLocaleString()}</time>
              </div>
              <p className="mt-2 text-slate-100">{event.description}</p>
              {event.metadata && (
                <pre className="mt-3 rounded-xl bg-black/30 p-3 text-[11px] text-slate-400">
                  {typeof event.metadata === 'string'
                    ? event.metadata
                    : JSON.stringify(event.metadata, null, 2)}
                </pre>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

