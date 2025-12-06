import React from 'react';
import useAuditEvents from '../hooks/useAuditEvents';

export default function AuditPage() {
  const events = useAuditEvents();

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-200">
      <h2 className="text-lg font-semibold text-white">Audit Timeline</h2>
      <div className="space-y-3">
        {events.length === 0 && <p className="text-xs text-slate-500">Loading events…</p>}
        {events.map((event: any) => (
          <div key={event.id || event.created_at} className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{event.event_type}</p>
              <span className="text-[11px] text-slate-500">
                {new Date(event.created_at).toLocaleString()}
              </span>
            </div>
            <p className="mt-2 font-semibold text-white">{event.metadata?.summary || event.stage || 'Insight'}</p>
            <p className="text-[11px] text-slate-400">
              {event.metadata?.details || event.metadata?.action || 'Action logged'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

