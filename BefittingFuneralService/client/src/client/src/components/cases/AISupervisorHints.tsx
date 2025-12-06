interface AISupervisorHintsProps {
  hints?: { type: string; message: string }[];
  loading?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  documents: 'Documents',
  charges: 'Charges',
  logistics: 'Logistics',
  missing_info: 'Info',
  insight: 'Insight'
};

export default function AISupervisorHints({ hints = [], loading }: AISupervisorHintsProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
        AI supervisor thinking…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
      <p className="text-xs uppercase tracking-wide text-slate-500">AI supervisor</p>
      {hints.length === 0 ? (
        <p className="text-sm text-slate-400">No suggestions right now.</p>
      ) : (
        hints.map((hint, index) => (
          <div
            key={`${hint.type}-${index}`}
            className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {TYPE_LABELS[hint.type] || 'Insight'}
            </span>
            <p className="mt-1 text-sm text-slate-100">{hint.message}</p>
          </div>
        ))
      )}
    </div>
  );
}

