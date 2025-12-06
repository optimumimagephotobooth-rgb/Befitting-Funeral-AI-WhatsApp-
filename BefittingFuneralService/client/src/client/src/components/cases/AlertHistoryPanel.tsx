import React from 'react';

export interface AlertHistoryEntry {
  id: string;
  title: string;
  description?: string;
  severity?: 'low' | 'medium' | 'high' | string;
  timestamp?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface AlertHistoryPanelProps {
  automationHistory: AlertHistoryEntry[];
  complianceEvents: AlertHistoryEntry[];
}

const severityBadge = (severity?: string) => {
  switch (severity) {
    case 'high':
      return 'bg-red-500 text-red-50';
    case 'medium':
      return 'bg-amber-400 text-amber-950';
    case 'low':
      return 'bg-slate-300 text-slate-900';
    default:
      return 'bg-slate-200 text-slate-900';
  }
};

export default function AlertHistoryPanel({ automationHistory, complianceEvents }: AlertHistoryPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Alert history</p>
          <p className="text-sm text-slate-300">Resolved automations & compliance waivers</p>
        </div>
      </header>
      <div className="space-y-3">
        {automationHistory.length === 0 && complianceEvents.length === 0 && (
          <p className="text-sm text-slate-500">No alert resolution history yet.</p>
        )}
        {automationHistory.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Automation history</p>
            {automationHistory.slice(0, 3).map((entry) => (
              <article key={`auto-${entry.id}`} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-200">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold shadow ${severityBadge(entry.severity)}`}>
                    {entry.severity || 'info'}
                  </span>
                  <time>{entry.resolvedAt ? new Date(entry.resolvedAt).toLocaleString() : entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—'}</time>
                </div>
                <p className="mt-2 font-semibold text-slate-100">{entry.title}</p>
                {entry.description && <p className="text-xs text-slate-400">{entry.description}</p>}
                {entry.resolvedBy && (
                  <p className="mt-1 text-[11px] text-slate-400">Resolved by {entry.resolvedBy}</p>
                )}
              </article>
            ))}
          </div>
        )}
        {complianceEvents.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Compliance activity</p>
            {complianceEvents.slice(0, 3).map((entry) => (
              <article key={`compliance-${entry.id}`} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-200">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
                  <span className="rounded-full bg-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-100 shadow">compliance</span>
                  <time>
                    {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : entry.resolvedAt ? new Date(entry.resolvedAt).toLocaleString() : '—'}
                  </time>
                </div>
                <p className="mt-2 font-semibold text-slate-100">{entry.title}</p>
                {entry.description && <p className="text-xs text-slate-400">{entry.description}</p>}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

